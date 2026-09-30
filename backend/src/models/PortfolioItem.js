const mongoose = require("mongoose");

const portfolioItemSchema = new mongoose.Schema(
  {
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
    },
    image: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "",
    },
    technologies: {
      type: [String],
      default: [],
      validate: {
        validator: (technologies) => technologies.length <= 15,
        message: "A portfolio item can have at most 15 technologies",
      },
    },
    projectUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    linkUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    linkLabel: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "",
    },
  },
  { timestamps: true },
);

portfolioItemSchema.index({ freelancer: 1, createdAt: -1 });

module.exports = mongoose.model("PortfolioItem", portfolioItemSchema);
