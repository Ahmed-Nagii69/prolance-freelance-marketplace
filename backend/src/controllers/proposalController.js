const Proposal = require("../models/Proposal");
const Project = require("../models/Project");
const Contract = require("../models/Contract");
const User = require("../models/User");
const sendResponse = require("../utils/response");
const { changeBalance } = require("../utils/ledger");
const { createNotification } = require("../utils/notify");
const { toCents, exceedBudgetValidation } = require("../utils/proposalValidation");

const createProposal = async (req, res, next) => {
  try {
    const { project, coverLetter, price, deliveryTime } = req.body;

    const parsedPrice = Number(price);
    const parsedDeliveryTime = Number(deliveryTime);

    if (
      !project ||
      typeof coverLetter !== "string" ||
      !coverLetter.trim() ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0 ||
      !Number.isInteger(parsedDeliveryTime) ||
      parsedDeliveryTime < 1
    ) {
      return sendResponse(
        res,
        400,
        "Project, cover letter, price and delivery time are required",
        null,
        { code: "VALIDATION_ERROR" },
      );
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

    const budgetError = exceedBudgetValidation(
      toCents(parsedPrice),
      toCents(projectExists.budget),
    );
    if (budgetError) {
      return sendResponse(res, 400, budgetError, null, {
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

    const proposal = await Proposal.create({
      project,
      freelancer: req.user._id,
      coverLetter: coverLetter.trim(),
      price: parsedPrice,
      deliveryTime: parsedDeliveryTime,
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
      .populate("project", "title description budget deadline status client")
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
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return sendResponse(res, 400, "Invalid proposal pagination", null, { code: "VALIDATION_ERROR" });
    }
    const filter = { project: req.params.projectId };
    const total = await Proposal.countDocuments(filter);
    const proposals = await Proposal.find(filter)
      .populate("freelancer", "name email role skills")
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    return sendResponse(
      res,
      200,
      "Project proposals fetched successfully",
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

const getProposalById = async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.id)
      .populate("project", "title description client status")
      .populate("freelancer", "name email role");

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
      { status: "ACCEPTED" },
      { new: true },
    );
    if (!acceptedProposal) {
      return sendResponse(res, 409, "Only pending proposals can be accepted", null, {
        code: "PROPOSAL_NOT_PENDING",
      });
    }

    await Proposal.updateMany(
      {
        project: proposal.project._id,
        _id: { $ne: proposal._id },
        status: "PENDING",
      },
      { status: "REJECTED" },
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
  getMyProposals,
  getProjectProposals,
  getProposalById,
  acceptProposal,
  rejectProposal,
};
