const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      default: null,
    },
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      default: null,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
  },
  { timestamps: true },
);

transactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);