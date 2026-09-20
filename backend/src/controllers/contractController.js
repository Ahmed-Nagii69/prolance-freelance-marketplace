const Contract = require("../models/Contract");
const Project = require("../models/Project");
const sendResponse = require("../utils/response");
const { changeBalance } = require("../utils/ledger");
const { createNotification } = require("../utils/notify");

const settleContract = async ({ contract, projectId }) => {
  if (contract.paymentReleased) {
    return;
  }
  const remaining =
    Math.round((contract.agreedPrice - (contract.heldAmount || 0)) * 100) / 100;
  if (remaining > 0) {
    await changeBalance({
      userId: contract.client,
      type: "DEBIT",
      amount: remaining,
      contract: contract._id,
      project: projectId,
      description: "Contract payment",
    });
  }
  await changeBalance({
    userId: contract.freelancer,
    type: "CREDIT",
    amount: contract.agreedPrice,
    contract: contract._id,
    project: projectId,
    description: "Payment received for completed contract",
  });
  contract.heldAmount = contract.agreedPrice;
  contract.paymentReleased = true;
  await contract.save();
};

const getContracts = async (req, res, next) => {
  try {
    const filter = {
      $or: [{ client: req.user._id }, { freelancer: req.user._id }],
    };
    const parsedPage = req.query.page === undefined ? 1 : Number(req.query.page);
    const parsedLimit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return sendResponse(res, 400, "Invalid contract pagination", null, { code: "VALIDATION_ERROR" });
    }
    const total = await Contract.countDocuments(filter);
    const contracts = await Contract.find(filter)
      .populate("project", "title status budget")
      .populate("proposal", "coverLetter price deliveryTime")
      .populate("client", "name email profileImage")
      .populate("freelancer", "name email profileImage")
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    return sendResponse(res, 200, "Contracts fetched successfully", {
      contracts,
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

const getContractById = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate("project", "title status budget client")
      .populate("proposal", "coverLetter price deliveryTime")
      .populate("client", "name email profileImage")
      .populate("freelancer", "name email profileImage");

    if (!contract) {
      return sendResponse(res, 404, "Contract not found", null, {
        code: "CONTRACT_NOT_FOUND",
      });
    }

    if (
      contract.client._id.toString() !== req.user._id.toString() &&
      contract.freelancer._id.toString() !== req.user._id.toString()
    ) {
      return sendResponse(
        res,
        403,
        "You are not allowed to view this contract",
        null,
        { code: "FORBIDDEN" },
      );
    }

    return sendResponse(res, 200, "Contract fetched successfully", contract);
  } catch (error) {
    return next(error);
  }
};

const submitWork = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id).populate("project");

    if (!contract) {
      return sendResponse(res, 404, "Contract not found", null, {
        code: "CONTRACT_NOT_FOUND",
      });
    }

    if (contract.freelancer.toString() !== req.user._id.toString()) {
      return sendResponse(
        res,
        403,
        "Only the freelancer can submit work for this contract",
        null,
        { code: "FORBIDDEN" },
      );
    }

    if (contract.status === "WORK_SUBMITTED") {
      return sendResponse(
        res,
        409,
        "Work is already submitted and awaiting approval",
        null,
        { code: "CONTRACT_WORK_ALREADY_SUBMITTED" },
      );
    }

    if (contract.status !== "ACTIVE") {
      return sendResponse(res, 409, "Contract is not active", null, {
        code: "CONTRACT_NOT_ACTIVE",
      });
    }

    const description =
      typeof req.body.description === "string" ? req.body.description.trim() : "";
    if (!description) {
      return sendResponse(
        res,
        400,
        "Please describe the work you completed",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }
    if (description.length > 5000) {
      return sendResponse(
        res,
        400,
        "Work description is too long (max 5000 characters)",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    contract.workSubmission = {
      description,
      submittedAt: new Date(),
      submittedBy: req.user._id,
    };
    contract.status = "WORK_SUBMITTED";
    await contract.save();

    await createNotification({
      user: contract.client,
      actor: req.user._id,
      type: "WORK_SUBMITTED",
      message: `${req.user.name} submitted work for "${contract.project.title}". Review it to release the payment.`,
      link: `/contracts/${contract._id}`,
    });

    return sendResponse(res, 200, "Work submitted successfully", contract);
  } catch (error) {
    return next(error);
  }
};

const approveWork = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id).populate("project");

    if (!contract) {
      return sendResponse(res, 404, "Contract not found", null, {
        code: "CONTRACT_NOT_FOUND",
      });
    }

    if (contract.client.toString() !== req.user._id.toString()) {
      return sendResponse(
        res,
        403,
        "Only the client can approve the submitted work",
        null,
        { code: "FORBIDDEN" },
      );
    }

    if (contract.status !== "WORK_SUBMITTED") {
      return sendResponse(
        res,
        409,
        "Work has not been submitted or is not awaiting approval",
        null,
        { code: "CONTRACT_NOT_PENDING_APPROVAL" },
      );
    }

    await settleContract({ contract, projectId: contract.project._id });

    contract.status = "COMPLETED";
    await contract.save();

    await Project.findByIdAndUpdate(contract.project._id, {
      status: "COMPLETED",
    });

    await createNotification({
      user: contract.freelancer,
      actor: req.user._id,
      type: "WORK_APPROVED",
      message: `Your submitted work for "${contract.project.title}" was approved`,
      link: `/contracts/${contract._id}`,
    });
    await createNotification({
      user: contract.freelancer,
      actor: req.user._id,
      type: "PAYMENT_RECEIVED",
      message: `You received ${contract.agreedPrice} for "${contract.project.title}"`,
      link: `/contracts/${contract._id}`,
    });

    return sendResponse(
      res,
      200,
      "Work approved and contract completed successfully",
      contract,
    );
  } catch (error) {
    return next(error);
  }
};

const rejectWork = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id).populate("project");

    if (!contract) {
      return sendResponse(res, 404, "Contract not found", null, {
        code: "CONTRACT_NOT_FOUND",
      });
    }

    if (contract.client.toString() !== req.user._id.toString()) {
      return sendResponse(
        res,
        403,
        "Only the client can return the submitted work",
        null,
        { code: "FORBIDDEN" },
      );
    }

    if (contract.status !== "WORK_SUBMITTED") {
      return sendResponse(
        res,
        409,
        "Work has not been submitted or is not awaiting review",
        null,
        { code: "CONTRACT_NOT_PENDING_APPROVAL" },
      );
    }

    const reason =
      typeof req.body.reason === "string" ? req.body.reason.trim() : "";
    if (reason.length > 1000) {
      return sendResponse(
        res,
        400,
        "Feedback is too long (max 1000 characters)",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    contract.workFeedback = reason;
    contract.workSubmission = {
      description: "",
      submittedAt: null,
      submittedBy: null,
    };
    contract.status = "ACTIVE";
    await contract.save();

    const message = reason
      ? `${req.user.name} asked you to make changes on "${contract.project.title}": ${reason}`
      : `Your work submission for "${contract.project.title}" was returned for changes`;

    await createNotification({
      user: contract.freelancer,
      actor: req.user._id,
      type: "WORK_REJECTED",
      message,
      link: `/contracts/${contract._id}`,
    });

    return sendResponse(res, 200, "Work returned for changes", contract);
  } catch (error) {
    return next(error);
  }
};

const completeContract = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id).populate("project");

    if (!contract) {
      return sendResponse(res, 404, "Contract not found", null, {
        code: "CONTRACT_NOT_FOUND",
      });
    }

    const isClient = contract.client.toString() === req.user._id.toString();
    const isFreelancer =
      contract.freelancer.toString() === req.user._id.toString();

    if (!isClient && !isFreelancer) {
      return sendResponse(
        res,
        403,
        "You are not allowed to complete this contract",
        null,
        { code: "FORBIDDEN" },
      );
    }

    if (contract.status !== "ACTIVE" && contract.status !== "WORK_SUBMITTED") {
      return sendResponse(
        res,
        409,
        "Contract is not active or awaiting approval",
        null,
        { code: "CONTRACT_NOT_ACTIVE" },
      );
    }

    if (!contract.paymentReleased) {
      await settleContract({ contract, projectId: contract.project._id });
    }

    contract.status = "COMPLETED";
    await contract.save();

    await Project.findByIdAndUpdate(contract.project._id, {
      status: "COMPLETED",
    });

    const counterparty = isClient ? contract.freelancer : contract.client;
    await createNotification({
      user: counterparty,
      actor: req.user._id,
      type: "CONTRACT_UPDATED",
      message: `${req.user.name} marked "${contract.project.title}" as completed`,
      link: `/contracts/${contract._id}`,
    });

    return sendResponse(res, 200, "Contract completed successfully", contract);
  } catch (error) {
    return next(error);
  }
};

const cancelContract = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id).populate("project");

    if (!contract) {
      return sendResponse(res, 404, "Contract not found", null, {
        code: "CONTRACT_NOT_FOUND",
      });
    }

    if (
      contract.client.toString() !== req.user._id.toString() &&
      contract.freelancer.toString() !== req.user._id.toString()
    ) {
      return sendResponse(
        res,
        403,
        "You are not allowed to cancel this contract",
        null,
        { code: "FORBIDDEN" },
      );
    }

    if (contract.status !== "ACTIVE") {
      return sendResponse(res, 409, "Contract is not active", null, {
        code: "CONTRACT_NOT_ACTIVE",
      });
    }

    if (contract.heldAmount > 0 && !contract.paymentReleased) {
      await changeBalance({
        userId: contract.client,
        type: "CREDIT",
        amount: contract.heldAmount,
        contract: contract._id,
        project: contract.project._id,
        description: "Refund for cancelled contract",
      });
      contract.heldAmount = 0;
    }

    contract.status = "CANCELLED";
    await contract.save();

    await Project.findByIdAndUpdate(contract.project._id, {
      status: "CANCELLED",
    });

    const counterparty =
      contract.client.toString() === req.user._id.toString()
        ? contract.freelancer
        : contract.client;
    await createNotification({
      user: counterparty,
      actor: req.user._id,
      type: "CONTRACT_UPDATED",
      message: `${req.user.name} cancelled "${contract.project.title}"`,
      link: `/contracts/${contract._id}`,
    });

    return sendResponse(res, 200, "Contract cancelled successfully", contract);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getContracts,
  getContractById,
  submitWork,
  approveWork,
  rejectWork,
  completeContract,
  cancelContract,
};