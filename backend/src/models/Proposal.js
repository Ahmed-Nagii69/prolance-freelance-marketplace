const mongoose = require("mongoose");

const proposalSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coverLetter: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryTime: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED"],
      default: "PENDING",
    },
    // A submitted bid may be revised exactly once. The ceiling lives on the
    // schema as well as in the controller, so the limit cannot be raised by
    // writing to the field directly.
    editCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    // Whether the client who owns the project has reviewed this bid. A project
    // has exactly one client, so a single flag is enough to drive the
    // seen / unseen filters.
    isSeen: {
      type: Boolean,
      default: false,
    },
    seenAt: {
      type: Date,
      default: null,
    },
    platformFeePercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    platformFeeAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    freelancerNetAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true },
);

proposalSchema.index({ project: 1, freelancer: 1 }, { unique: true });
proposalSchema.index({ freelancer: 1, createdAt: -1 });
proposalSchema.index({ project: 1, status: 1 });
proposalSchema.index({ project: 1, isSeen: 1 });

module.exports = mongoose.model("Proposal", proposalSchema);
