const Proposal = require("../models/Proposal");
const Project = require("../models/Project");
const Contract = require("../models/Contract");
const User = require("../models/User");
const PlatformSetting = require("../models/PlatformSetting");
const sendResponse = require("../utils/response");
const { changeBalance } = require("../utils/ledger");
const { createNotification } = require("../utils/notify");
const {
  parseProposalPrice,
  validateProposalPrice,
  resolveProposalRange,
} = require("../config/proposalBudget");
const { hasRole } = require("../middleware/roleMiddleware");

const getPlatformFeePercent = async () => {
  const setting = await PlatformSetting.findOne().sort({ createdAt: 1 }).lean();
  return setting?.platformFeePercent ?? 10;
};

const calculatePlatformFee = (amount, percent) => {
  const feeAmount = Math.round(amount * (percent / 100) * 100) / 100;
  const netAmount = Math.round((amount - feeAmount) * 100) / 100;
  return { feeAmount, netAmount };
};

/**
 * Validates the shared parts of a bid: cover letter and delivery time. The price
 * is checked separately because its allowed range depends on the project budget.
 */
const validateBidFields = ({ coverLetter, deliveryTime }) => {
  if (typeof coverLetter !== "string" || !coverLetter.trim()) {
    return { ok: false, reason: "Write a cover letter explaining your approach" };
  }
  if (coverLetter.trim().length > 5000) {
    return { ok: false, reason: "The cover letter is too long" };
  }
  if (deliveryTime === undefined || deliveryTime === null || deliveryTime === "") {
    return { ok: false, reason: "Enter how many days the work will take" };
  }
  if (typeof deliveryTime !== "number" && typeof deliveryTime !== "string") {
    return { ok: false, reason: "Delivery time must be a number" };
  }
  if (!/^\d+$/.test(String(deliveryTime).trim())) {
    return { ok: false, reason: "Delivery time must be a whole number of days" };
  }
  const days = Number(String(deliveryTime).trim());
  if (!Number.isInteger(days) || days < 1) {
    return { ok: false, reason: "Delivery time must be at least 1 day" };
  }
  return { ok: true, coverLetter: coverLetter.trim(), deliveryTime: days };
};

const checkDeliveryFitsProject = (deliveryTime, project) => {
  if (deliveryTime > project.durationDays) {
    return `Delivery time cannot exceed the project duration of ${project.durationDays} days`;
  }
  return null;
};

const createProposal = async (req, res, next) => {
  try {
    if (!hasRole(req.user, "FREELANCER")) {
      return sendResponse(
        res,
        403,
        "Only a freelancer account can submit a proposal",
        null,
        { code: "FORBIDDEN" },
      );
    }

    const { project, coverLetter, price, deliveryTime } = req.body;

    if (!project || typeof project !== "string") {
      return sendResponse(res, 400, "Choose a project to propose on", null, {
        code: "VALIDATION_ERROR",
      });
    }

    const fields = validateBidFields({ coverLetter, deliveryTime });
    if (!fields.ok) {
      return sendResponse(res, 400, fields.reason, null, {
        code: "VALIDATION_ERROR",
      });
    }

    // Rejects missing, zero, negative, boolean, array, non-numeric and
    // sub-cent values before the project is even looked up.
    const parsed = parseProposalPrice(price);
    if (!parsed.ok) {
      return sendResponse(res, 400, parsed.reason, null, {
        code: "VALIDATION_ERROR",
      });
    }

    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return sendResponse(res, 404, "Project not found", null, {
        code: "PROJECT_NOT_FOUND",
      });
    }

    if (projectExists.client.toString() === req.user._id.toString()) {
      return sendResponse(res, 403, "You cannot submit a proposal to your own project", null, {
        code: "FORBIDDEN",
      });
    }

    if (projectExists.status !== "OPEN") {
      return sendResponse(res, 409, "Proposals are only accepted for open projects", null, {
        code: "PROJECT_NOT_OPEN",
      });
    }

    const deliveryError = checkDeliveryFitsProject(fields.deliveryTime, projectExists);
    if (deliveryError) {
      return sendResponse(res, 400, deliveryError, null, {
        code: "VALIDATION_ERROR",
      });
    }

    const budgetCheck = validateProposalPrice(
      parsed.value,
      projectExists.minBudget,
      projectExists.maxBudget,
    );
    if (!budgetCheck.ok) {
      return sendResponse(res, 400, budgetCheck.reason, null, {
        code: "VALIDATION_ERROR",
      });
    }

    const existingProposal = await Proposal.findOne({
      project,
      freelancer: req.user._id,
    });
    if (existingProposal) {
      return sendResponse(
        res,
        409,
        "You already submitted a proposal for this project",
        null,
        { code: "PROPOSAL_EXISTS" },
      );
    }

    const platformFeePercent = await getPlatformFeePercent();
    const { feeAmount: platformFeeAmount, netAmount: freelancerNetAmount } = calculatePlatformFee(
      budgetCheck.value,
      platformFeePercent,
    );

    const proposal = await Proposal.create({
      project,
      freelancer: req.user._id,
      coverLetter: fields.coverLetter,
      price: budgetCheck.value,
      deliveryTime: fields.deliveryTime,
      platformFeePercent,
      platformFeeAmount,
      freelancerNetAmount,
    });

    await createNotification({
      user: projectExists.client,
      actor: req.user._id,
      type: "PROPOSAL",
      message: `${req.user.name} submitted a proposal for "${projectExists.title}"`,
      link: `/projects/${projectExists._id}/proposals`,
    });

    return sendResponse(res, 201, "Proposal submitted successfully", proposal);
  } catch (error) {
    return next(error);
  }
};

/**
 * The single allowed revision of a submitted bid.
 *
 * Every rule that applied at submission is applied again: ownership, a still
 * pending proposal, a still open project, the delivery window and the full
 * budget range. The write itself is a conditional update, so two simultaneous
 * edits cannot both succeed.
 */
const updateProposal = async (req, res, next) => {
  try {
    if (!hasRole(req.user, "FREELANCER")) {
      return sendResponse(
        res,
        403,
        "Only the freelancer who submitted a proposal can edit it",
        null,
        { code: "FORBIDDEN" },
      );
    }

    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      return sendResponse(res, 404, "Proposal not found", null, {
        code: "PROPOSAL_NOT_FOUND",
      });
    }

    if (proposal.freelancer.toString() !== req.user._id.toString()) {
      return sendResponse(
        res,
        403,
        "You can only edit a proposal you submitted yourself",
        null,
        { code: "FORBIDDEN" },
      );
    }

    if (proposal.editCount >= 1) {
      return sendResponse(
        res,
        409,
        "This proposal has already been edited and can no longer be changed",
        null,
        { code: "PROPOSAL_NOT_EDITABLE" },
      );
    }

    if (proposal.status !== "PENDING") {
      return sendResponse(
        res,
        409,
        "Only a pending proposal can be edited",
        null,
        { code: "PROPOSAL_NOT_PENDING" },
      );
    }

    const project = await Project.findById(proposal.project);
    if (!project) {
      return sendResponse(res, 404, "Project not found", null, {
        code: "PROJECT_NOT_FOUND",
      });
    }

    if (project.status !== "OPEN") {
      return sendResponse(
        res,
        409,
        "This project is no longer accepting changes to proposals",
        null,
        { code: "PROJECT_NOT_OPEN" },
      );
    }

    const { coverLetter, price, deliveryTime } = req.body;

    const fields = validateBidFields({ coverLetter, deliveryTime });
    if (!fields.ok) {
      return sendResponse(res, 400, fields.reason, null, {
        code: "VALIDATION_ERROR",
      });
    }

    const parsed = parseProposalPrice(price);
    if (!parsed.ok) {
      return sendResponse(res, 400, parsed.reason, null, {
        code: "VALIDATION_ERROR",
      });
    }

    const deliveryError = checkDeliveryFitsProject(fields.deliveryTime, project);
    if (deliveryError) {
      return sendResponse(res, 400, deliveryError, null, {
        code: "VALIDATION_ERROR",
      });
    }

    const budgetCheck = validateProposalPrice(
      parsed.value,
      project.minBudget,
      project.maxBudget,
    );
    if (!budgetCheck.ok) {
      return sendResponse(res, 400, budgetCheck.reason, null, {
        code: "VALIDATION_ERROR",
      });
    }

    const platformFeePercent = await getPlatformFeePercent();
    const { feeAmount, netAmount } = calculatePlatformFee(
      budgetCheck.value,
      platformFeePercent,
    );

    // editCount 0 and PENDING in the filter make this the single point at which
    // a second concurrent edit loses.
    const updated = await Proposal.findOneAndUpdate(
      { _id: proposal._id, editCount: 0, status: "PENDING" },
      {
        $set: {
          coverLetter: fields.coverLetter,
          price: budgetCheck.value,
          deliveryTime: fields.deliveryTime,
          platformFeePercent,
          platformFeeAmount: feeAmount,
          freelancerNetAmount: netAmount,
          editCount: 1,
        },
      },
      { new: true },
    );

    if (!updated) {
      return sendResponse(
        res,
        409,
        "This proposal has already been edited and can no longer be changed",
        null,
        { code: "PROPOSAL_NOT_EDITABLE" },
      );
    }

    await createNotification({
      user: project.client,
      actor: req.user._id,
      type: "PROPOSAL",
      message: `${req.user.name} updated their proposal for "${project.title}"`,
      link: `/projects/${project._id}/proposals`,
    });

    return sendResponse(res, 200, "Proposal updated successfully", updated);
  } catch (error) {
    return next(error);
  }
};

/**
 * The bid range for a project, served from the same module that validates it so
 * the numbers the form shows can never drift from the numbers the API accepts.
 */
const getProposalLimits = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId).select(
      "minBudget maxBudget durationDays status client title",
    );

    if (!project) {
      return sendResponse(res, 404, "Project not found", null, {
        code: "PROJECT_NOT_FOUND",
      });
    }

    const { min, max } = resolveProposalRange(
      project.minBudget,
      project.maxBudget,
    );

    return sendResponse(res, 200, "Proposal limits fetched successfully", {
      min,
      max,
      minBudget: project.minBudget,
      maxBudget: project.maxBudget,
      durationDays: project.durationDays,
      projectStatus: project.status,
      isOwnProject: project.client.toString() === req.user._id.toString(),
    });
  } catch (error) {
    return next(error);
  }
};

const getMyProposals = async (req, res, next) => {
  try {
    const filter = { freelancer: req.user._id };
    const parsedPage = req.query.page === undefined ? 1 : Number(req.query.page);
    const parsedLimit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return sendResponse(res, 400, "Invalid proposal pagination", null, { code: "VALIDATION_ERROR" });
    }
    const total = await Proposal.countDocuments(filter);
    const proposals = await Proposal.find(filter)
      .populate(
        "project",
        "title description minBudget maxBudget durationDays status client",
      )
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    return sendResponse(
      res,
      200,
      "Your proposals fetched successfully",
      { proposals, pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
        hasNextPage: parsedPage * parsedLimit < total,
        hasPreviousPage: parsedPage > 1,
      } },
    );
  } catch (error) {
    return next(error);
  }
};

const SEEN_VIEWS = ["ALL", "SEEN", "UNSEEN"];

const getProjectProposals = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return sendResponse(res, 404, "Project not found", null, {
        code: "PROJECT_NOT_FOUND",
      });
    }

    if (project.client.toString() !== req.user._id.toString()) {
      return sendResponse(
        res,
        403,
        "You are not allowed to view proposals for this project",
        null,
        { code: "FORBIDDEN" },
      );
    }

    const parsedPage = req.query.page === undefined ? 1 : Number(req.query.page);
    const parsedLimit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    const view = req.query.view === undefined ? "ALL" : String(req.query.view).toUpperCase();

    if (
      !Number.isInteger(parsedPage) ||
      parsedPage < 1 ||
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100
    ) {
      return sendResponse(res, 400, "Invalid proposal pagination", null, { code: "VALIDATION_ERROR" });
    }
    if (!SEEN_VIEWS.includes(view)) {
      return sendResponse(res, 400, "Invalid proposal view filter", null, {
        code: "VALIDATION_ERROR",
      });
    }

    const filter = { project: req.params.projectId };
    if (view === "SEEN") {
      filter.isSeen = true;
    } else if (view === "UNSEEN") {
      filter.isSeen = false;
    }

    // The counts describe the whole project, not just the current page, so the
    // filter chips can show All / Seen / Unseen next to the number each one
    // returns regardless of which page is open.
    const [total, seenCount, unseenCount] = await Promise.all([
      Proposal.countDocuments({ project: req.params.projectId }),
      Proposal.countDocuments({ project: req.params.projectId, isSeen: true }),
      Proposal.countDocuments({ project: req.params.projectId, isSeen: false }),
    ]);

    const proposals = await Proposal.find(filter)
      .populate("freelancer", "name email role skills profileImage")
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    return sendResponse(
      res,
      200,
      "Project proposals fetched successfully",
      { proposals, counts: { all: total, seen: seenCount, unseen: unseenCount }, pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
        hasNextPage: parsedPage * parsedLimit < total,
        hasPreviousPage: parsedPage > 1,
      } },
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * Records that the client who owns the project has reviewed a proposal. Only
 * that client may call it, and it is idempotent: re-reading a proposal leaves
 * the original timestamp alone so "first seen" stays meaningful.
 */
const markProposalAsSeen = async (req, res, next) => {
  try {
    if (!hasRole(req.user, "CLIENT")) {
      return sendResponse(
        res,
        403,
        "Only the client who owns the project can mark proposals as seen",
        null,
        { code: "FORBIDDEN" },
      );
    }

    const proposal = await Proposal.findById(req.params.id).populate(
      "project",
      "client title",
    );

    if (!proposal) {
      return sendResponse(res, 404, "Proposal not found", null, {
        code: "PROPOSAL_NOT_FOUND",
      });
    }

    if (proposal.project.client.toString() !== req.user._id.toString()) {
      return sendResponse(
        res,
        403,
        "You are not allowed to act on proposals for this project",
        null,
        { code: "FORBIDDEN" },
      );
    }

    if (!proposal.isSeen) {
      proposal.isSeen = true;
      proposal.seenAt = new Date();
      await proposal.save();
    }

    return sendResponse(res, 200, "Proposal marked as seen", proposal);
  } catch (error) {
    return next(error);
  }
};

const getProposalById = async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.id)
      .populate("project", "title description client status")
      .populate("freelancer", "name email role profileImage");

    if (!proposal) {
      return sendResponse(res, 404, "Proposal not found", null, {
        code: "PROPOSAL_NOT_FOUND",
      });
    }

    if (
      proposal.freelancer._id.toString() !== req.user._id.toString() &&
      proposal.project.client.toString() !== req.user._id.toString()
    ) {
      return sendResponse(
        res,
        403,
        "You are not allowed to view this proposal",
        null,
        { code: "FORBIDDEN" },
      );
    }

    return sendResponse(res, 200, "Proposal fetched successfully", proposal);
  } catch (error) {
    return next(error);
  }
};

const acceptProposal = async (req, res, next) => {
  try {
    if (!hasRole(req.user, "CLIENT")) {
      return sendResponse(
        res,
        403,
        "Only the client who owns the project can accept a proposal",
        null,
        { code: "FORBIDDEN" },
      );
    }

    const proposal = await Proposal.findById(req.params.id)
      .populate("project")
      .populate("freelancer", "name");

    if (!proposal) {
      return sendResponse(res, 404, "Proposal not found", null, {
        code: "PROPOSAL_NOT_FOUND",
      });
    }

    if (proposal.project.client.toString() !== req.user._id.toString()) {
      return sendResponse(
        res,
        403,
        "You are not allowed to accept this proposal",
        null,
        { code: "FORBIDDEN" },
      );
    }

    if (proposal.status !== "PENDING") {
      return sendResponse(
        res,
        409,
        "Only pending proposals can be accepted",
        null,
        {
          code: "PROPOSAL_NOT_PENDING",
        },
      );
    }

    if (proposal.project.status !== "OPEN") {
      return sendResponse(res, 409, "Only proposals for open projects can be accepted", null, {
        code: "PROJECT_NOT_OPEN",
      });
    }

    const clientUser = await User.findById(proposal.project.client);
    if (!clientUser || clientUser.balance < proposal.price) {
      return sendResponse(
        res,
        400,
        "You do not have enough balance to accept this proposal. Add funds to your wallet first.",
        null,
        { code: "INSUFFICIENT_BALANCE" },
      );
    }

    const competitorProposals = await Proposal.find({
      project: proposal.project._id,
      _id: { $ne: proposal._id },
      status: "PENDING",
    }).select("freelancer");

    const acceptedProposal = await Proposal.findOneAndUpdate(
      { _id: proposal._id, status: "PENDING" },
      { status: "ACCEPTED", isSeen: true, seenAt: proposal.seenAt || new Date() },
      { new: true },
    );
    if (!acceptedProposal) {
      return sendResponse(res, 409, "Only pending proposals can be accepted", null, {
        code: "PROPOSAL_NOT_PENDING",
      });
    }

    // Every rival bid is now decided. Marking them seen keeps the client's
    // unseen count honest without them having to open each one.
    await Proposal.updateMany(
      {
        project: proposal.project._id,
        _id: { $ne: proposal._id },
        status: "PENDING",
      },
      { status: "REJECTED", isSeen: true, seenAt: new Date() },
    );

    const deadline = new Date(
      Date.now() + proposal.deliveryTime * 24 * 60 * 60 * 1000,
    );
    const contract = await Contract.create({
      project: proposal.project._id,
      proposal: proposal._id,
      client: proposal.project.client,
      freelancer: proposal.freelancer,
      agreedPrice: proposal.price,
      startDate: new Date(),
      deadline,
      status: "ACTIVE",
      platformFeePercent: proposal.platformFeePercent,
      platformFeeAmount: proposal.platformFeeAmount,
      freelancerNetAmount: proposal.freelancerNetAmount,
    });

    await changeBalance({
      userId: clientUser._id,
      type: "DEBIT",
      amount: proposal.price,
      contract: contract._id,
      project: proposal.project._id,
      description: `Funds held for contract with ${proposal.freelancer.name || "freelancer"}`,
    });
    contract.heldAmount = proposal.price;
    await contract.save();

    await Project.findByIdAndUpdate(proposal.project._id, {
      status: "IN_PROGRESS",
    });

    await createNotification({
      user: proposal.freelancer._id,
      type: "PROPOSAL_ACCEPTED",
      message: `Your proposal for "${proposal.project.title}" was accepted`,
      link: `/contracts/${contract._id}`,
      actor: req.user._id,
    });
    await createNotification({
      user: proposal.freelancer._id,
      type: "CONTRACT_CREATED",
      message: `A contract has started for "${proposal.project.title}"`,
      link: `/contracts/${contract._id}`,
      actor: req.user._id,
    });

    for (const competitor of competitorProposals) {
      await createNotification({
        user: competitor.freelancer,
        type: "PROPOSAL_REJECTED",
        message: `Your proposal for "${proposal.project.title}" was not selected`,
        link: "/proposals/my",
        actor: req.user._id,
      });
    }

    return sendResponse(res, 200, "Proposal accepted successfully", acceptedProposal);
  } catch (error) {
    return next(error);
  }
};

const rejectProposal = async (req, res, next) => {
  try {
    if (!hasRole(req.user, "CLIENT")) {
      return sendResponse(
        res,
        403,
        "Only the client who owns the project can reject a proposal",
        null,
        { code: "FORBIDDEN" },
      );
    }

    const proposal = await Proposal.findById(req.params.id).populate("project");

    if (!proposal) {
      return sendResponse(res, 404, "Proposal not found", null, {
        code: "PROPOSAL_NOT_FOUND",
      });
    }

    if (proposal.project.client.toString() !== req.user._id.toString()) {
      return sendResponse(
        res,
        403,
        "You are not allowed to reject this proposal",
        null,
        { code: "FORBIDDEN" },
      );
    }

    if (proposal.status !== "PENDING") {
      return sendResponse(
        res,
        409,
        "Only pending proposals can be rejected",
        null,
        {
          code: "PROPOSAL_NOT_PENDING",
        },
      );
    }

    proposal.status = "REJECTED";
    // Deciding on a proposal means it has been read.
    if (!proposal.isSeen) {
      proposal.isSeen = true;
      proposal.seenAt = new Date();
    }
    await proposal.save();

    await createNotification({
      user: proposal.freelancer,
      actor: req.user._id,
      type: "PROPOSAL_REJECTED",
      message: `Your proposal for "${proposal.project.title}" was rejected`,
      link: "/proposals/my",
    });

    return sendResponse(res, 200, "Proposal rejected successfully", proposal);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createProposal,
  updateProposal,
  getProposalLimits,
  getMyProposals,
  getProjectProposals,
  getProposalById,
  markProposalAsSeen,
  acceptProposal,
  rejectProposal,
};
