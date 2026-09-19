const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    passwordResetOtpHash: {
      type: String,
      select: false,
    },
    passwordResetOtpExpiresAt: {
      type: Date,
      select: false,
    },
    passwordResetAuthorizationHash: {
      type: String,
      select: false,
    },
    passwordResetAuthorizationExpiresAt: {
      type: Date,
      select: false,
    },
    role: {
      type: String,
      enum: ["CLIENT", "FREELANCER", "ADMIN"],
      required: true,
    },
    bio: {
      type: String,
      maxlength: 2000,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (skills) => skills.length <= 30,
        message: "A user can have at most 30 skills",
      },
    },
    profileImage: {
      type: String,
      maxlength: 1000,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
