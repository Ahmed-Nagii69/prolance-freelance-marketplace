const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

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
    balance: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Moderation. A ban is always an explicit admin action; resolving a dispute
    // never sets it. `bannedUntil` of null means permanent, otherwise the ban
    // lapses on its own once that moment passes.
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: "",
      maxlength: 500,
    },
    bannedAt: {
      type: Date,
      default: null,
    },
    bannedUntil: {
      type: Date,
      default: null,
    },
    bannedBy: {
      type: ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.index({ isBanned: 1, bannedUntil: 1 });

module.exports = mongoose.model("User", userSchema);
