const User = require("../models/User");
const Review = require("../models/Review");
const FreelancerProfile = require("../models/FreelancerProfile");
const Project = require("../models/Project");
const Proposal = require("../models/Proposal");
const Contract = require("../models/Contract");
const Message = require("../models/Message");
const sendResponse = require("../utils/response");

const deleteUserData = async (userId) => {
  const projects = await Project.find({ client: userId }).select("_id");
  const projectIds = projects.map((project) => project._id);

  await Promise.all([
    FreelancerProfile.deleteOne({ user: userId }),
    Proposal.deleteMany({
      $or: [{ freelancer: userId }, { project: { $in: projectIds } }],
    }),
    Contract.deleteMany({
      $or: [
        { client: userId },
        { freelancer: userId },
        { project: { $in: projectIds } },
      ],
    }),
    Message.deleteMany({
      $or: [
        { sender: userId },
        { receiver: userId },
        { project: { $in: projectIds } },
      ],
    }),
    Review.deleteMany({ $or: [{ reviewer: userId }, { reviewee: userId }] }),
    Project.deleteMany({ client: userId }),
  ]);
};

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    return sendResponse(res, 200, "Profile fetched successfully", user);
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, bio, skills, profileImage } = req.body;

    if (
      (name !== undefined && typeof name !== "string") ||
      (bio !== undefined && typeof bio !== "string") ||
      (skills !== undefined && !Array.isArray(skills)) ||
      (profileImage !== undefined && typeof profileImage !== "string")
    ) {
      return sendResponse(res, 400, "Invalid profile data", null, {
        code: "VALIDATION_ERROR",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(bio !== undefined && { bio }),
        ...(skills !== undefined && { skills }),
        ...(profileImage !== undefined && { profileImage }),
      },
      { new: true, runValidators: true },
    ).select("-password");

    return sendResponse(res, 200, "Profile updated successfully", updatedUser);
  } catch (error) {
    return next(error);
  }
};

const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendResponse(res, 400, "No photo file provided", null, {
        code: "VALIDATION_ERROR",
      });
    }

    const photoUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: photoUrl },
      { new: true, runValidators: true },
    ).select("-password");

    return sendResponse(res, 200, "Profile photo updated successfully", user);
  } catch (error) {
    return next(error);
  }
};

const getFreelancerProfile = async (req, res, next) => {
  try {
    const profile = await FreelancerProfile.findOne({ user: req.user._id })
      .populate("user", "name email role bio skills profileImage")
      .lean();

    if (!profile) {
      return sendResponse(res, 404, "Freelancer profile not found", null, {
        code: "PROFILE_NOT_FOUND",
      });
    }

    return sendResponse(res, 200, "Freelancer profile fetched successfully", profile);
  } catch (error) {
    return next(error);
  }
};

const updateFreelancerProfile = async (req, res, next) => {
  try {
    const { title, bio, hourlyRate, skills } = req.body;
    if (
      (title !== undefined && typeof title !== "string") ||
      (bio !== undefined && typeof bio !== "string") ||
      (hourlyRate !== undefined && !Number.isFinite(Number(hourlyRate))) ||
      (skills !== undefined && !Array.isArray(skills))
    ) {
      return sendResponse(res, 400, "Invalid freelancer profile data", null, {
        code: "VALIDATION_ERROR",
      });
    }
    const update = {};

    if (title !== undefined) update.title = title;
    if (bio !== undefined) update.bio = bio;
    if (hourlyRate !== undefined) update.hourlyRate = hourlyRate;
    if (skills !== undefined) update.skills = skills;

    const profile = await FreelancerProfile.findOneAndUpdate(
      { user: req.user._id },
      update,
      { new: true, runValidators: true },
    ).populate("user", "name email role bio skills profileImage");

    if (!profile) {
      return sendResponse(res, 404, "Freelancer profile not found", null, {
        code: "PROFILE_NOT_FOUND",
      });
    }

    return sendResponse(res, 200, "Freelancer profile updated successfully", profile);
  } catch (error) {
    return next(error);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return sendResponse(res, 404, "User not found", null, {
        code: "USER_NOT_FOUND",
      });
    }

    await deleteUserData(user._id);
    await user.deleteOne();

    return sendResponse(res, 200, "Account deleted successfully", null);
  } catch (error) {
    return next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const parsedPage = req.query.page === undefined ? 1 : Number(req.query.page);
    const parsedLimit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return sendResponse(res, 400, "Invalid user pagination", null, { code: "VALIDATION_ERROR" });
    }
    const total = await User.countDocuments();
    const users = await User.find().select("-password").sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);
    return sendResponse(res, 200, "Users fetched successfully", {
      count: total,
      users,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
        hasNextPage: parsedPage * parsedLimit < total,
        hasPreviousPage: parsedPage > 1,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const deleteUserByAdmin = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return sendResponse(res, 400, "An admin cannot delete their own account here", null, {
        code: "INVALID_OPERATION",
      });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return sendResponse(res, 404, "User not found", null, {
        code: "USER_NOT_FOUND",
      });
    }

    await deleteUserData(user._id);
    await user.deleteOne();

    return sendResponse(res, 200, "User deleted successfully", null);
  } catch (error) {
    return next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return sendResponse(res, 404, "User not found", null, {
        code: "USER_NOT_FOUND",
      });
    }

    return sendResponse(res, 200, "User fetched successfully", user);
  } catch (error) {
    return next(error);
  }
};

const getUserReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.id })
      .populate("reviewer", "name role")
      .populate("reviewee", "name role")
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, "Reviews fetched successfully", reviews);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  getFreelancerProfile,
  updateFreelancerProfile,
  deleteAccount,
  getAllUsers,
  deleteUserByAdmin,
  getUserById,
  getUserReviews,
};
