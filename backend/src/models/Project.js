const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    deadline: {
      type: Date,
      required: true,
    },
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (skills) => skills.length <= 30,
        message: "A project can have at most 30 skills",
      },
    },
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "OPEN",
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

projectSchema.index({ client: 1, createdAt: -1 });
projectSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Project", projectSchema);
