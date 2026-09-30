const Project = require("../models/Project");
const Proposal = require("../models/Proposal");
const Contract = require("../models/Contract");
const Dispute = require("../models/Dispute");
const Message = require("../models/Message");
const Review = require("../models/Review");
const sendResponse = require("../utils/response");
const { hasRole } = require("../middleware/roleMiddleware");

/**
 * Posting and managing a project is a client-only action. Freelancers are not
 * clients and admins moderate the platform rather than hire through it, so both
 * are refused here. The route already restricts the role; this repeats the check
 * inside the handler so a later route change cannot quietly reopen the flow.
 */
const CLIENT_ONLY_MESSAGE = "Only a client account can post or manage a project";

const requireClient = (req, res) => {
  if (hasRole(req.user, "CLIENT")) {
    return false;
  }
  sendResponse(res, 403, CLIENT_ONLY_MESSAGE, null, { code: "FORBIDDEN" });
  return true;
};

/**
 * Normalises one budget bound. `undefined` means "not supplied", which is
 * distinct from an invalid value so a partial update can leave the other bound
 * untouched. Anything present has to be a real, positive, cent-precision
 * number.
 */
const parseBudgetBound = (raw) => {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: false, missing: true };
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, reason: "Budget bounds must be positive numbers" };
  }
  if (Math.abs(Math.round(value * 100) / 100 - value) > 1e-9) {
    return { ok: false, reason: "Budget bounds allow at most 2 decimal places" };
  }
  return { ok: true, value };
};

const createProject = async (req, res, next) => {
  try {
    if (requireClient(req, res)) {
      return;
    }

    const { title, description, minBudget, maxBudget, durationDays, skills } =
      req.body;

    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const cleanDescription =
      typeof description === "string" ? description.trim() : "";
    const lowBound = parseBudgetBound(minBudget);
    const highBound = parseBudgetBound(maxBudget);
    const parsedDurationDays = Number(durationDays);

    if (
      !cleanTitle ||
      !cleanDescription ||
      !lowBound.ok ||
      !highBound.ok ||
      (skills !== undefined &&
        (!Array.isArray(skills) || skills.length > 30)) ||
      !Number.isInteger(parsedDurationDays) ||
      parsedDurationDays < 1
    ) {
      return sendResponse(
        res,
        400,
        lowBound.reason ||
          highBound.reason ||
          (lowBound.ok &&
          highBound.ok &&
          highBound.value < lowBound.value
            ? "The maximum budget cannot be lower than the minimum budget"
            : null) ||
          "Title, description, a valid budget range and a positive duration in days are required",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    const project = await Project.create({
      title: cleanTitle,
      description: cleanDescription,
      minBudget: lowBound.value,
      maxBudget: highBound.value,
      durationDays: parsedDurationDays,
      skills: skills || [],
      client: req.user._id,
    });

    return sendResponse(res, 201, "Project created successfully", project);
  } catch (error) {
    return next(error);
  }
};

/**
 * Returns the page as plain objects, with `proposalCount` attached to every one
 * of them, so a project card can show how many bids a brief has attracted.
 *
 * One grouped aggregation covers the whole page, so the count costs a single
 * extra query no matter how many cards are rendered: it is never fetched per
 * project, and the `$match` is limited to the ids on this page.
 *
 * The projects are flattened with `toObject()` first: Mongoose runs in strict
 * mode, so a field that is not on the schema would be dropped if the count were
 * assigned to the document itself.
 */
const withProposalCounts = async (projects) => {
  const payload = projects.map((project) => project.toObject());

  if (payload.length === 0) {
    return payload;
  }

  const counts = await Proposal.aggregate([
    { $match: { project: { $in: payload.map((project) => project._id) } } },
    { $group: { _id: "$project", total: { $sum: 1 } } },
  ]);

  const totals = new Map(counts.map((row) => [String(row._id), row.total]));
  for (const project of payload) {
    // Always written, including as 0, so a card can render "0 proposals"
    // instead of having to treat a missing field as unknown.
    project.proposalCount = totals.get(String(project._id)) ?? 0;
  }

  return payload;
};

const getProjects = async (req, res, next) => {
  try {
    const {
      search,
      status,
      skill,
      minBudget,
      maxBudget,
      sortBy = "createdAt",
      sortOrder = "desc",
      page,
      limit,
    } = req.query;

    // `budget` stays accepted so the existing sort control keeps working, but it
    // now resolves to the lower bound of the range.
    const allowedSortFields = [
      "createdAt",
      "budget",
      "minBudget",
      "maxBudget",
      "durationDays",
      "title",
    ];
    const sortFieldAliases = { budget: "minBudget" };
    const parsedMinBudget =
      minBudget === undefined ? undefined : Number(minBudget);
    const parsedMaxBudget =
      maxBudget === undefined ? undefined : Number(maxBudget);
    const parsedPage = page === undefined ? 1 : Number(page);
    const parsedLimit = limit === undefined ? 20 : Number(limit);

    if (
      (search !== undefined &&
        (typeof search !== "string" || search.length > 200)) ||
      (skill !== undefined &&
        (typeof skill !== "string" || skill.length > 100)) ||
      (status !== undefined &&
        !["OPEN", "IN_PROGRESS", "DISPUTED", "COMPLETED", "CANCELLED"].includes(
          status,
        )) ||
      (minBudget !== undefined &&
        (!Number.isFinite(parsedMinBudget) || parsedMinBudget < 0)) ||
      (maxBudget !== undefined &&
        (!Number.isFinite(parsedMaxBudget) || parsedMaxBudget < 0)) ||
      (parsedMinBudget !== undefined &&
        parsedMaxBudget !== undefined &&
        parsedMinBudget > parsedMaxBudget) ||
      !allowedSortFields.includes(sortBy) ||
      !["asc", "desc"].includes(sortOrder) ||
      !Number.isInteger(parsedPage) ||
      parsedPage < 1 ||
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100
    ) {
      return sendResponse(res, 400, "Invalid project query parameters", null, {
        code: "VALIDATION_ERROR",
      });
    }

    const filter = {};
    if (search) {
      const escapedSearch = String(search).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      filter.$or = [
        { title: { $regex: escapedSearch, $options: "i" } },
        { description: { $regex: escapedSearch, $options: "i" } },
      ];
    }
    if (status) {
      filter.status = status;
    }
    if (skill) {
      filter.skills = skill;
    }
    // A budget filter matches any project whose range overlaps the requested
    // window: `minBudget` keeps projects that can reach the lower bound,
    // `maxBudget` keeps projects that start at or below the upper bound.
    if (minBudget !== undefined) {
      filter.maxBudget = { $gte: parsedMinBudget };
    }
    if (maxBudget !== undefined) {
      filter.minBudget = { ...(filter.minBudget || {}), $lte: parsedMaxBudget };
    }

    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const sortField = sortFieldAliases[sortBy] || sortBy;
    const query = Project.find(filter)
      .populate("client", "name role profileImage")
      .sort({ [sortField]: sortDirection });

    const total = await Project.countDocuments(filter);
    const pageDocs = await query
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);
    const projects = await withProposalCounts(pageDocs);

    return sendResponse(res, 200, "Projects fetched successfully", {
      projects,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
        hasNextPage: parsedPage * parsedLimit < total,
        hasPreviousPage: parsedPage > 1,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).populate(
      "client",
      "name role profileImage",
    );

    if (!project) {
      return sendResponse(res, 404, "Project not found", null, {
        code: "PROJECT_NOT_FOUND",
      });
    }

    // The same helper the listings use, so a card and the brief agree on the
    // number. What the page shows about it is unchanged: the count is only
    // rendered for the owner, which the frontend decides.
    const [payload] = await withProposalCounts([project]);

    return sendResponse(res, 200, "Project fetched successfully", payload);
  } catch (error) {
    return next(error);
  }
};

const getMyProjects = async (req, res, next) => {
  try {
    // One aggregation for the whole page instead of a count query per project.
    // $set/$unset rather than $project, because a $project that keeps the
    // document as-is and also drops a field is an illegal mix of inclusion and
    // exclusion in MongoDB 5.
    const projects = await Project.aggregate([
      { $match: { client: req.user._id } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "proposals",
          localField: "_id",
          foreignField: "project",
          as: "proposalDocs",
        },
      },
      { $set: { proposalCount: { $size: "$proposalDocs" } } },
      { $unset: "proposalDocs" },
    ]);

    return sendResponse(res, 200, "My projects fetched successfully", projects);
  } catch (error) {
    return next(error);
  }
};

const updateProject = async (req, res, next) => {
  try {
    if (requireClient(req, res)) {
      return;
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return sendResponse(res, 404, "Project not found", null, {
        code: "PROJECT_NOT_FOUND",
      });
    }

    if (project.client.toString() !== req.user._id.toString()) {
      return sendResponse(
        res,
        403,
        "You are not allowed to update this project",
        null,
        { code: "FORBIDDEN" },
      );
    }

    // Once work has started the brief is locked: a contract moves the project
    // to IN_PROGRESS, so anything but OPEN means the terms can no longer change.
    if (project.status !== "OPEN") {
      return sendResponse(
        res,
        409,
        "This project can no longer be edited because work has already started.",
        null,
        { code: "PROJECT_NOT_EDITABLE" },
      );
    }

    const { title, description, minBudget, maxBudget, durationDays, skills, status } =
      req.body;
    const cleanTitle = title === undefined ? undefined : String(title).trim();
    const cleanDescription =
      description === undefined ? undefined : String(description).trim();
    const lowBound = parseBudgetBound(minBudget);
    const highBound = parseBudgetBound(maxBudget);
    const parsedDurationDays =
      durationDays === undefined ? undefined : Number(durationDays);

    // On a partial update an absent bound simply keeps its stored value, so only
    // a bound that is present *and* unusable is rejected here. `createProject`
    // is the opposite: both bounds are mandatory, so a missing one is an error.
    const lowInvalid = !lowBound.ok && !lowBound.missing;
    const highInvalid = !highBound.ok && !highBound.missing;

    // The ordering check compares each incoming value against whichever bound is
    // already stored.
    const effectiveMin = lowBound.ok ? lowBound.value : project.minBudget;
    const effectiveMax = highBound.ok ? highBound.value : project.maxBudget;

    if (
      (cleanTitle !== undefined && !cleanTitle) ||
      (cleanDescription !== undefined && !cleanDescription) ||
      lowInvalid ||
      highInvalid ||
      effectiveMax < effectiveMin ||
      (skills !== undefined &&
        (!Array.isArray(skills) || skills.length > 30)) ||
      (durationDays !== undefined &&
        (!Number.isInteger(parsedDurationDays) || parsedDurationDays < 1)) ||
      status !== undefined
    ) {
      return sendResponse(
        res,
        400,
        lowBound.reason ||
          highBound.reason ||
          (effectiveMax < effectiveMin
            ? "The maximum budget cannot be lower than the minimum budget"
            : "Invalid project data"),
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      {
        ...(cleanTitle !== undefined && { title: cleanTitle }),
        ...(cleanDescription !== undefined && {
          description: cleanDescription,
        }),
        ...(lowBound.ok && { minBudget: lowBound.value }),
        ...(highBound.ok && { maxBudget: highBound.value }),
        ...(durationDays !== undefined && {
          durationDays: parsedDurationDays,
        }),
        ...(skills !== undefined && { skills }),
      },
      { new: true, runValidators: true },
    );

    return sendResponse(
      res,
      200,
      "Project updated successfully",
      updatedProject,
    );
  } catch (error) {
    return next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    if (requireClient(req, res)) {
      return;
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return sendResponse(res, 404, "Project not found", null, {
        code: "PROJECT_NOT_FOUND",
      });
    }

    if (project.client.toString() !== req.user._id.toString()) {
      return sendResponse(
        res,
        403,
        "You are not allowed to delete this project",
        null,
        { code: "FORBIDDEN" },
      );
    }

    const activeContract = await Contract.exists({
      project: project._id,
      status: { $in: ["ACTIVE", "WORK_SUBMITTED", "DISPUTED"] },
    });
    if (activeContract) {
      return sendResponse(
        res,
        409,
        "This project has an active contract with held funds. Complete or cancel the contract before deleting the project.",
        null,
        { code: "PROJECT_DELETION_BLOCKED" },
      );
    }

    const openDispute = await Dispute.exists({
      project: project._id,
      status: { $in: Dispute.ACTIVE_STATUSES },
    });
    if (openDispute) {
      return sendResponse(
        res,
        409,
        "This project has an open dispute that is still being reviewed. Wait for it to be resolved before deleting the project.",
        null,
        { code: "PROJECT_DELETION_BLOCKED" },
      );
    }

    await Proposal.deleteMany({ project: project._id });
    const contracts = await Contract.find({ project: project._id }).select(
      "_id",
    );
    await Review.deleteMany({
      contract: { $in: contracts.map((contract) => contract._id) },
    });
    await Contract.deleteMany({ project: project._id });
    await Message.deleteMany({ project: project._id });
    await Project.findByIdAndDelete(req.params.id);

    return sendResponse(res, 200, "Project deleted successfully", null);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  getMyProjects,
  updateProject,
  deleteProject,
};
