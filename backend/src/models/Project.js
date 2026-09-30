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
    minBudget: {
      type: Number,
      required: true,
      min: 0,
    },
    maxBudget: {
      type: Number,
      required: true,
      min: 0,
      // The budget is a range, so the two bounds have to stay ordered. Declared
      // on the path rather than in a document hook so it also fires on a partial
      // update, where Mongoose runs path validators but not document middleware.
      // `this.minBudget` already reflects the incoming value on such an update.
      validate: {
        validator: function isNotBelowMin(value) {
          return this.minBudget === undefined || value >= this.minBudget;
        },
        message:
          "The maximum budget cannot be lower than the minimum budget",
      },
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
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
      enum: [
        "OPEN",
        "IN_PROGRESS",
        "DISPUTED",
        "COMPLETED",
        "CANCELLED",
      ],
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
projectSchema.index({ minBudget: 1, maxBudget: 1 });

module.exports = mongoose.model("Project", projectSchema);
