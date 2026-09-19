const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const FreelancerProfile = require("../models/FreelancerProfile");
const sendResponse = require("../utils/response");
const { sendPasswordResetEmail } = require("../utils/mailer");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidPassword = (password) =>
  typeof password === "string" &&
  password.length >= 6 &&
  password.length <= 128;

const hashResetValue = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, bio, skills, profileImage } = req.body;
    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const cleanPassword = typeof password === "string" ? password : "";

    if (
      !cleanName ||
      cleanName.length > 120 ||
      !emailPattern.test(cleanEmail) ||
      !cleanEmail ||
      !isValidPassword(cleanPassword) ||
      !role ||
      (bio !== undefined && (typeof bio !== "string" || bio.length > 2000)) ||
      (skills !== undefined &&
        (!Array.isArray(skills) || skills.length > 30)) ||
      (profileImage !== undefined &&
        (typeof profileImage !== "string" || profileImage.length > 1000))
    ) {
      return sendResponse(
        res,
        400,
        "Name, email, password and role are required",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    if (!["CLIENT", "FREELANCER"].includes(role)) {
      return sendResponse(res, 400, "Role must be CLIENT or FREELANCER", null, {
        code: "VALIDATION_ERROR",
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return sendResponse(res, 409, "User already exists", null, {
        code: "USER_EXISTS",
      });
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role,
      bio: bio || "",
      skills: skills || [],
      profileImage: profileImage || "",
    });

    if (role === "FREELANCER") {
      await FreelancerProfile.create({ user: user._id });
    }

    const token = generateToken(user);

    return sendResponse(res, 201, "User registered successfully", {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        skills: user.skills,
        profileImage: user.profileImage,
        balance: user.balance,
      },
      token,
    });
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !isValidPassword(newPassword)
    ) {
      return sendResponse(
        res,
        400,
        "Current password and a new password of at least 6 characters are required",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    const user = await User.findById(req.user._id);
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return sendResponse(res, 400, "Current password is incorrect", null, {
        code: "INVALID_PASSWORD",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return sendResponse(res, 200, "Password changed successfully", {
      token: generateToken(user),
    });
  } catch (error) {
    return next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const cleanEmail =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const genericMessage =
      "If the account exists, a password reset code has been sent";

    if (!cleanEmail || !emailPattern.test(cleanEmail)) {
      return sendResponse(res, 400, "A valid email is required", null, {
        code: "VALIDATION_ERROR",
      });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return sendResponse(res, 200, genericMessage, null);
    }

    const otp = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
    const otpHash = hashResetValue(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.passwordResetOtpHash = otpHash;
    user.passwordResetOtpExpiresAt = otpExpiresAt;
    user.passwordResetAuthorizationHash = undefined;
    user.passwordResetAuthorizationExpiresAt = undefined;
    await user.save();

    try {
      await sendPasswordResetEmail({ email: user.email, otp });
    } catch (error) {
      await User.updateOne(
        { _id: user._id, passwordResetOtpHash: otpHash },
        {
          $unset: {
            passwordResetOtpHash: 1,
            passwordResetOtpExpiresAt: 1,
            passwordResetAuthorizationHash: 1,
            passwordResetAuthorizationExpiresAt: 1,
          },
        },
      );
      return next(error);
    }

    return sendResponse(res, 200, genericMessage, null);
  } catch (error) {
    return next(error);
  }
};

const verifyResetOtp = async (req, res, next) => {
  try {
    const cleanEmail =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const { otp } = req.body;
    if (
      !emailPattern.test(cleanEmail) ||
      typeof otp !== "string" ||
      !/^\d{6}$/.test(otp)
    ) {
      return sendResponse(
        res,
        400,
        "A valid email and 6-digit reset code are required",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    const otpHash = hashResetValue(otp);
    const resetAuthorization = crypto.randomBytes(32).toString("hex");
    const authorizationHash = hashResetValue(resetAuthorization);
    const user = await User.findOneAndUpdate(
      {
        email: cleanEmail,
        passwordResetOtpHash: otpHash,
        passwordResetOtpExpiresAt: { $gt: new Date() },
      },
      {
        passwordResetAuthorizationHash: authorizationHash,
        passwordResetAuthorizationExpiresAt: new Date(
          Date.now() + 10 * 60 * 1000,
        ),
        $unset: {
          passwordResetOtpHash: 1,
          passwordResetOtpExpiresAt: 1,
        },
      },
      { new: true },
    );

    if (!user) {
      return sendResponse(res, 400, "Invalid or expired reset code", null, {
        code: "INVALID_RESET_OTP",
      });
    }

    return sendResponse(res, 200, "Reset code verified successfully", {
      resetAuthorization,
    });
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { resetAuthorization, newPassword } = req.body;
    if (
      typeof resetAuthorization !== "string" ||
      !resetAuthorization ||
      !isValidPassword(newPassword)
    ) {
      return sendResponse(
        res,
        400,
        "A reset authorization and a new password of 6 to 128 characters are required",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    const authorizationHash = hashResetValue(resetAuthorization);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await User.findOneAndUpdate(
      {
        passwordResetAuthorizationHash: authorizationHash,
        passwordResetAuthorizationExpiresAt: { $gt: new Date() },
      },
      {
        password: hashedPassword,
        $unset: {
          passwordResetAuthorizationHash: 1,
          passwordResetAuthorizationExpiresAt: 1,
        },
      },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      return sendResponse(
        res,
        400,
        "Invalid or expired reset authorization",
        null,
        {
          code: "INVALID_RESET_AUTHORIZATION",
        },
      );
    }

    return sendResponse(res, 200, "Password reset successfully", {
      token: generateToken(updatedUser),
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const cleanEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!cleanEmail || !password) {
      return sendResponse(res, 400, "Email and password are required", null, {
        code: "VALIDATION_ERROR",
      });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return sendResponse(res, 401, "Invalid email or password", null, {
        code: "INVALID_CREDENTIALS",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendResponse(res, 401, "Invalid email or password", null, {
        code: "INVALID_CREDENTIALS",
      });
    }

    const token = generateToken(user);

    return sendResponse(res, 200, "Login successful", {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        skills: user.skills,
        profileImage: user.profileImage,
        balance: user.balance,
      },
      token,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  changePassword,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};
