const User = require("../models/User");
const Project = require("../models/Project");
const Contract = require("../models/Contract");
const Dispute = require("../models/Dispute");
const sendResponse = require("../utils/response");
const { changeBalance } = require("../utils/ledger");
const { createNotification } = require("../utils/notify");
const { settleContract } = require("./contractController");

const MAX_REASON = 120;
const MAX_DESCRIPTION = 4000;
const MAX_NOTE = 2000;

// A contract can only be disputed while its money is still held, so the admin
// always has a real financial choice to make.
const DISPUTABLE_STATUSES = ["ACTIVE", "WORK_SUBMITTED"];

const round2 = (value) => Math.round(value * 100) / 100;

const cleanText = (value, maxLength) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
};

const isParty = (contract, userId) =>
  contract.client.toString() === userId.toString() ||
  contract.freelancer.toString() === userId.toString();

const outcomeLabel = (outcome) => {
  if (outcome === "RELEASE") return "released to the freelancer";
  if (outcome === "REFUND") return "refunded to the client";
  return "split between both parties";
};

const getContractDispute = async (contractId) =>
  Dispute.findOne({ contract: contractId }).sort({ createdAt: -1 });

const openDispute = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id).populate("project");

    if (!contract) {
      return sendResponse(res, 404, "Contract not found", null, {
        code: "CONTRACT_NOT_FOUND",
      });
    }

    if (!isParty(contract, req.user._id)) {
      return sendResponse(
        res,
        403,
        "Only the client or the freelancer of this contract can open a dispute",
        null,
        { code: "FORBIDDEN" },
      );
    }

    if (!DISPUTABLE_STATUSES.includes(contract.status)) {
      return sendResponse(
        res,
        409,
        "This contract can no longer be disputed",
        null,
        { code: "CONTRACT_NOT_DISPUTABLE" },
      );
    }

    if (contract.paymentReleased || contract.heldAmount <= 0) {
      return sendResponse(
        res,
        409,
        "The payment for this contract has already been settled",
        null,
        { code: "CONTRACT_PAYMENT_SETTLED" },
      );
    }

    const active = await Dispute.exists({
      contract: contract._id,
      status: { $in: Dispute.ACTIVE_STATUSES },
    });
    if (active) {
      return sendResponse(
        res,
        409,
        "There is already an open dispute for this contract",
        null,
        { code: "DISPUTE_ALREADY_OPEN" },
      );
    }

    const reason = cleanText(req.body.reason, MAX_REASON);
    const description = cleanText(req.body.description, MAX_DESCRIPTION);
    if (!reason || !description) {
      return sendResponse(
        res,
        400,
        "A short reason and a description of the problem are required",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    const counterparty =
      contract.client.toString() === req.user._id.toString()
        ? contract.freelancer
        : contract.client;

    const dispute = await Dispute.create({
      contract: contract._id,
      project: contract.project._id,
      raisedBy: req.user._id,
      against: counterparty,
      reason,
      description,
    });

    // The dispute becomes a real state on both records, not just a record of
    // one. Every other flow keys off `status`, so this is what actually freezes
    // delivery, approval and cancellation until an admin resolves it. The
    // dispute row is written first: the duplicate check above plus the partial
    // unique index mean a second attempt is refused either way, whereas a
    // half-written dispute would leave the escrow unlocked with nothing to
    // review it.
    contract.status = "DISPUTED";
    await contract.save();
    await Project.findByIdAndUpdate(contract.project._id, { status: "DISPUTED" });

    const message = `${req.user.name} opened a dispute on "${contract.project.title}": ${reason}`;

    await createNotification({
      user: counterparty,
      actor: req.user._id,
      type: "DISPUTE_OPENED",
      message,
      link: `/contracts/${contract._id}`,
    });

    const admins = await User.find({ role: "ADMIN" }).select("_id");
    await Promise.all(
      admins.map((admin) =>
        createNotification({
          user: admin._id,
          actor: req.user._id,
          type: "DISPUTE_OPENED",
          message,
          link: `/admin/disputes`,
        }),
      ),
    );

    return sendResponse(res, 201, "Dispute opened successfully", dispute);
  } catch (error) {
    return next(error);
  }
};

const getDisputeForContract = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id).populate("project");

    if (!contract) {
      return sendResponse(res, 404, "Contract not found", null, {
        code: "CONTRACT_NOT_FOUND",
      });
    }

    if (!isParty(contract, req.user._id) && req.user.role !== "ADMIN") {
      return sendResponse(
        res,
        403,
        "You are not allowed to view the disputes of this contract",
        null,
        { code: "FORBIDDEN" },
      );
    }

    const dispute = await getContractDispute(contract._id)
      .populate("raisedBy", "name role profileImage")
      .populate("against", "name role profileImage")
      .populate("resolution.resolvedBy", "name");

    return sendResponse(res, 200, "Contract dispute fetched successfully", {
      dispute: dispute || null,
    });
  } catch (error) {
    return next(error);
  }
};

const getProjectDispute = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return sendResponse(res, 404, "Project not found", null, {
        code: "PROJECT_NOT_FOUND",
      });
    }

    const dispute = await Dispute.findOne({ project: project._id })
      .sort({ createdAt: -1 })
      .populate("raisedBy", "name role profileImage")
      .populate("against", "name role profileImage")
      .populate("contract", "_id agreedPrice heldAmount paymentReleased status")
      .populate("resolution.resolvedBy", "name");

    // A dispute is two people making claims about each other, so only the
    // parties named in it and an admin may read the reason and the description.
    // The brief stays public; the argument behind it does not.
    const viewerId = req.user._id.toString();
    const involved = [dispute.raisedBy, dispute.against].some(
      (party) => party && party._id.toString() === viewerId,
    );

    if (dispute && !involved && req.user.role !== "ADMIN") {
      return sendResponse(
        res,
        403,
        "You are not allowed to view the disputes of this project",
        null,
        { code: "FORBIDDEN" },
      );
    }

    return sendResponse(res, 200, "Project dispute fetched successfully", {
      dispute: dispute || null,
    });
  } catch (error) {
    return next(error);
  }
};

const getDisputes = async (req, res, next) => {
  try {
    const filter = {};

    const status = typeof req.query.status === "string" ? req.query.status : "";
    if (status && status !== "ALL") {
      if (!Dispute.schema.path("status").enumValues.includes(status)) {
        return sendResponse(res, 400, "Invalid dispute status", null, {
          code: "VALIDATION_ERROR",
        });
      }
      filter.status = status;
    }

    const parsedPage = req.query.page === undefined ? 1 : Number(req.query.page);
    const parsedLimit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    if (
      !Number.isInteger(parsedPage) ||
      parsedPage < 1 ||
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100
    ) {
      return sendResponse(res, 400, "Invalid dispute pagination", null, {
        code: "VALIDATION_ERROR",
      });
    }

    const total = await Dispute.countDocuments(filter);
    const disputes = await Dispute.find(filter)
      .populate("project", "title")
      .populate(
        "contract",
        "agreedPrice heldAmount paymentReleased status",
      )
      .populate("raisedBy", "name role profileImage")
      .populate("against", "name role profileImage")
      .populate("resolution.resolvedBy", "name")
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    return sendResponse(res, 200, "Disputes fetched successfully", {
      disputes,
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

const reviewDispute = async (req, res, next) => {
  try {
    const dispute = await Dispute.findById(req.params.id).populate("project", "title");

    if (!dispute) {
      return sendResponse(res, 404, "Dispute not found", null, {
        code: "DISPUTE_NOT_FOUND",
      });
    }

    if (dispute.status !== "OPEN") {
      return sendResponse(
        res,
        409,
        "Only an open dispute can be sent for review",
        null,
        { code: "DISPUTE_NOT_OPEN" },
      );
    }

    const note =
      typeof req.body.note === "string" ? req.body.note.trim() : "";
    if (note.length > MAX_NOTE) {
      return sendResponse(res, 400, "The note is too long", null, {
        code: "VALIDATION_ERROR",
      });
    }

    dispute.status = "UNDER_REVIEW";
    dispute.statusHistory.push({
      status: "UNDER_REVIEW",
      note,
      by: req.user._id,
      at: new Date(),
    });
    await dispute.save();

    const message = `Your dispute on "${dispute.project.title}" is now under review`;

    await Promise.all(
      [dispute.raisedBy, dispute.against].map((user) =>
        createNotification({
          user,
          actor: req.user._id,
          type: "CONTRACT_UPDATED",
          message,
          link: `/contracts/${dispute.contract}`,
        }),
      ),
    );

    return sendResponse(res, 200, "Dispute moved to review successfully", dispute);
  } catch (error) {
    return next(error);
  }
};

const resolveDispute = async (req, res, next) => {
  try {
    const dispute = await Dispute.findById(req.params.id).populate("project", "title");

    if (!dispute) {
      return sendResponse(res, 404, "Dispute not found", null, {
        code: "DISPUTE_NOT_FOUND",
      });
    }

    if (!Dispute.ACTIVE_STATUSES.includes(dispute.status)) {
      return sendResponse(
        res,
        409,
        "This dispute has already been finalized",
        null,
        { code: "DISPUTE_ALREADY_FINALIZED" },
      );
    }

    const outcome =
      typeof req.body.outcome === "string"
        ? req.body.outcome.trim().toUpperCase()
        : "";
    if (!Dispute.OUTCOMES.includes(outcome)) {
      return sendResponse(
        res,
        400,
        "Choose how the held payment should be settled",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    const note =
      typeof req.body.note === "string" ? req.body.note.trim() : "";
    if (note.length > MAX_NOTE) {
      return sendResponse(res, 400, "The note is too long", null, {
        code: "VALIDATION_ERROR",
      });
    }

    const contract = await Contract.findById(dispute.contract);

    if (!contract) {
      return sendResponse(res, 404, "Contract not found", null, {
        code: "CONTRACT_NOT_FOUND",
      });
    }

    // The single guard that keeps a resolution one-time: money can only move
    // while the escrow of this contract is still held.
    if (contract.paymentReleased || contract.heldAmount <= 0) {
      return sendResponse(
        res,
        409,
        "The payment for this contract is already settled",
        null,
        { code: "CONTRACT_PAYMENT_SETTLED" },
      );
    }

    const resolution = {
      outcome,
      amountToFreelancer: 0,
      amountToClient: 0,
      platformFeeAmount: 0,
      note,
      resolvedBy: req.user._id,
      resolvedAt: new Date(),
    };

    if (outcome === "RELEASE") {
      // Reuses the normal release path, so a dispute releases exactly what a
      // regular completion would have released.
      await settleContract({ contract, projectId: contract.project });
      contract.status = "COMPLETED";
      await contract.save();

      resolution.amountToFreelancer = round2(contract.agreedPrice);
      resolution.platformFeeAmount = round2(contract.platformFeeAmount || 0);
      await Project.findByIdAndUpdate(contract.project, { status: "COMPLETED" });
    } else if (outcome === "REFUND") {
      const refund = round2(contract.heldAmount);
      await changeBalance({
        userId: contract.client,
        type: "CREDIT",
        amount: refund,
        contract: contract._id,
        project: contract.project,
        description: "Refund for resolved contract dispute",
      });

      contract.heldAmount = 0;
      contract.status = "CANCELLED";
      await contract.save();

      resolution.amountToClient = refund;
      await Project.findByIdAndUpdate(contract.project, { status: "CANCELLED" });
    } else {
      const requested = Number(req.body.amountToFreelancer);
      if (
        !Number.isFinite(requested) ||
        requested <= 0 ||
        requested >= contract.agreedPrice ||
        requested > (contract.heldAmount || 0)
      ) {
        return sendResponse(
          res,
          400,
          "Enter an amount for the freelancer between 0 and the held escrow amount",
          null,
          { code: "VALIDATION_ERROR" },
        );
      }

      const released = round2(requested);
      const remaining = round2(contract.agreedPrice - (contract.heldAmount || 0));
      if (remaining > 0) {
        await changeBalance({
          userId: contract.client,
          type: "DEBIT",
          amount: remaining,
          contract: contract._id,
          project: contract.project,
          description: "Contract payment",
        });
      }

      const feePercent = contract.platformFeePercent || 0;
      const fee = feePercent > 0 ? round2((released * feePercent) / 100) : 0;
      const net = round2(released - Math.min(fee, released));

      await changeBalance({
        userId: contract.freelancer,
        type: "CREDIT",
        amount: net,
        contract: contract._id,
        project: contract.project,
        description: "Payment received for resolved contract dispute",
      });

      const refund = round2(contract.agreedPrice - released);
      if (refund > 0) {
        await changeBalance({
          userId: contract.client,
          type: "CREDIT",
          amount: refund,
          contract: contract._id,
          project: contract.project,
          description: "Partial refund for resolved contract dispute",
        });
      }

      contract.heldAmount = 0;
      contract.paymentReleased = true;
      contract.platformFeeAmount = round2(Math.min(fee, released));
      contract.freelancerNetAmount = net;
      contract.status = "CANCELLED";
      await contract.save();

      resolution.amountToFreelancer = released;
      resolution.amountToClient = refund;
      resolution.platformFeeAmount = contract.platformFeeAmount;
      await Project.findByIdAndUpdate(contract.project, { status: "CANCELLED" });
    }

    dispute.status = "RESOLVED";
    dispute.resolution = resolution;
    dispute.statusHistory.push({
      status: "RESOLVED",
      note: note || `Payment ${outcomeLabel(outcome)}`,
      by: req.user._id,
      at: resolution.resolvedAt,
    });
    await dispute.save();

    const message = `The dispute on "${dispute.project.title}" was resolved: the payment was ${outcomeLabel(outcome)}`;

    await Promise.all(
      [dispute.raisedBy, dispute.against].map((user) =>
        createNotification({
          user,
          actor: req.user._id,
          type: "DISPUTE_RESOLVED",
          message,
          link: `/contracts/${dispute.contract}`,
        }),
      ),
    );

    return sendResponse(res, 200, "Dispute resolved successfully", dispute);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  openDispute,
  getDisputeForContract,
  getProjectDispute,
  getDisputes,
  reviewDispute,
  resolveDispute,
};
