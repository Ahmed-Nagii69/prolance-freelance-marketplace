const mongoose = require("mongoose");

const freelancerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    hourlyRate: {
      type: Number,
      min: 0,
      default: 0,
    },
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (skills) => skills.length <= 30,
        message: "A freelancer can have at most 30 skills",
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("FreelancerProfile", freelancerProfileSchema);