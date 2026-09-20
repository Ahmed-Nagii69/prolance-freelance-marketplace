const Project = require("../models/Project");
const Proposal = require("../models/Proposal");
const Contract = require("../models/Contract");
const Message = require("../models/Message");
const Review = require("../models/Review");
const sendResponse = require("../utils/response");

const createProject = async (req, res, next) => {
  try {
    const { title, description, budget, durationDays, skills } = req.body;

    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const cleanDescription =
      typeof description === "string" ? description.trim() : "";
    const parsedBudget = Number(budget);
    const parsedDurationDays = Number(durationDays);

    if (
      !cleanTitle ||
      !cleanDescription ||
      budget === undefined ||
      budget === null ||
      durationDays === undefined ||
      durationDays === null ||
      (skills !== undefined && (!Array.isArray(skills) || skills.length > 30)) ||
      Number.isNaN(parsedBudget) ||
      parsedBudget <= 0 ||
      !Number.isInteger(parsedDurationDays) ||
      parsedDurationDays < 1
    ) {
      return sendResponse(
        res,
        400,
        "Title, description, valid budget and a positive duration in days are required",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    const project = await Project.create({
      title: cleanTitle,
      description: cleanDescription,
      budget: parsedBudget,
      durationDays: parsedDurationDays,
      skills: skills || [],
      client: req.user._id,
    });

    return sendResponse(res, 201, "Project created successfully", project);
  } catch (error) {
    return next(error);
  }
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

    const allowedSortFields = ["createdAt", "budget", "durationDays", "title"];
    const parsedMinBudget =
      minBudget === undefined ? undefined : Number(minBudget);
    const parsedMaxBudget =
      maxBudget === undefined ? undefined : Number(maxBudget);
    const parsedPage = page === undefined ? 1 : Number(page);
    const parsedLimit = limit === undefined ? 20 : Number(limit);

    if (
      (search !== undefined && (typeof search !== "string" || search.length > 200)) ||
      (skill !== undefined && (typeof skill !== "string" || skill.length > 100)) ||
      (status !== undefined &&
        !["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) ||
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
    if (minBudget !== undefined || maxBudget !== undefined) {
      filter.budget = {};
      if (minBudget !== undefined) filter.budget.$gte = parsedMinBudget;
      if (maxBudget !== undefined) filter.budget.$lte = parsedMaxBudget;
    }

    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const query = Project.find(filter)
      .populate("client", "name email role")
      .sort({ [sortBy]: sortDirection });

    const total = await Project.countDocuments(filter);
    const projects = await query
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

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
      "name email role",
    );

    if (!project) {
      return sendResponse(res, 404, "Project not found", null, {
        code: "PROJECT_NOT_FOUND",
      });
    }

    return sendResponse(res, 200, "Project fetched successfully", project);
  } catch (error) {
    return next(error);
  }
};

const getMyProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ client: req.user._id }).sort({
      createdAt: -1,
    });
    return sendResponse(res, 200, "My projects fetched successfully", projects);
  } catch (error) {
    return next(error);
  }
};

const updateProject = async (req, res, next) => {
  try {
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

    const { title, description, budget, durationDays, skills, status } = req.body;
    const cleanTitle = title === undefined ? undefined : String(title).trim();
    const cleanDescription =
      description === undefined ? undefined : String(description).trim();
    const parsedBudget = budget === undefined ? undefined : Number(budget);
    const parsedDurationDays =
      durationDays === undefined ? undefined : Number(durationDays);

    if (
      (cleanTitle !== undefined && !cleanTitle) ||
      (cleanDescription !== undefined && !cleanDescription) ||
      (parsedBudget !== undefined &&
        (!Number.isFinite(parsedBudget) || parsedBudget <= 0)) ||
      (skills !== undefined && (!Array.isArray(skills) || skills.length > 30)) ||
      (durationDays !== undefined &&
        (!Number.isInteger(parsedDurationDays) || parsedDurationDays < 1)) ||
      status !== undefined
    ) {
      return sendResponse(res, 400, "Invalid project data", null, {
        code: "VALIDATION_ERROR",
      });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      {
        ...(cleanTitle !== undefined && { title: cleanTitle }),
        ...(cleanDescription !== undefined && {
          description: cleanDescription,
        }),
        ...(parsedBudget !== undefined && { budget: parsedBudget }),
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
