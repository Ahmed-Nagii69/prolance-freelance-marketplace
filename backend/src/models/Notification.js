const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      enum: [
        "PROPOSAL",
        "PROPOSAL_ACCEPTED",
        "PROPOSAL_REJECTED",
        "CONTRACT_CREATED",
        "CONTRACT_UPDATED",
        "WORK_SUBMITTED",
        "WORK_APPROVED",
        "WORK_REJECTED",
        "PAYMENT_RECEIVED",
        "MESSAGE",
        "REVIEW",
        "SYSTEM",
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    link: {
      type: String,
      default: "",
      maxlength: 300,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

module.exports = mongoose.model("Notification", notificationSchema);