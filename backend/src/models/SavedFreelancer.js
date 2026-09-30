const mongoose = require("mongoose");

const savedFreelancerSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

savedFreelancerSchema.index({ client: 1, freelancer: 1 }, { unique: true });
savedFreelancerSchema.index({ client: 1, createdAt: -1 });
savedFreelancerSchema.index({ freelancer: 1 });

module.exports = mongoose.model("SavedFreelancer", savedFreelancerSchema);
