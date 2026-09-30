const mongoose = require("mongoose");

const ACTIVE_STATUSES = ["OPEN", "UNDER_REVIEW"];
const OUTCOMES = ["RELEASE", "REFUND", "SPLIT"];

const disputeSchema = new mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    against: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    status: {
      type: String,
      enum: ["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"],
      default: "OPEN",
    },
    resolution: {
      outcome: {
        type: String,
        enum: [...OUTCOMES, null],
        default: null,
      },
      // Gross share of the escrow that goes to the freelancer. The platform fee
      // is deducted from this amount, exactly like a normal release.
      amountToFreelancer: {
        type: Number,
        min: 0,
        default: 0,
      },
      amountToClient: {
        type: Number,
        min: 0,
        default: 0,
      },
      platformFeeAmount: {
        type: Number,
        min: 0,
        default: 0,
      },
      note: {
        type: String,
        maxlength: 2000,
        default: "",
      },
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      resolvedAt: {
        type: Date,
        default: null,
      },
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        note: {
          type: String,
          maxlength: 2000,
          default: "",
        },
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);

// Only one dispute per contract can be OPEN at a time. Once it is rejected or
// resolved a new one may be filed, while the controller keeps a single
// UNDER_REVIEW case per contract as well.
disputeSchema.index(
  { contract: 1 },
  { unique: true, partialFilterExpression: { status: "OPEN" } },
);
disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ raisedBy: 1, createdAt: -1 });
disputeSchema.index({ against: 1, createdAt: -1 });

const Dispute = mongoose.model("Dispute", disputeSchema);
Dispute.ACTIVE_STATUSES = ACTIVE_STATUSES;
Dispute.OUTCOMES = OUTCOMES;

module.exports = Dispute;
