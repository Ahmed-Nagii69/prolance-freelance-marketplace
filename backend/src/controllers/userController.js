const User = require("../models/User");
const Review = require("../models/Review");
const FreelancerProfile = require("../models/FreelancerProfile");
const Project = require("../models/Project");
const Proposal = require("../models/Proposal");
const Contract = require("../models/Contract");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const Transaction = require("../models/Transaction");
const PortfolioItem = require("../models/PortfolioItem");
const SavedFreelancer = require("../models/SavedFreelancer");
const Dispute = require("../models/Dispute");
const sendResponse = require("../utils/response");
const { createNotification } = require("../utils/notify");
const { DAY_MS } = require("../config/proposalBudget");
const {
  isBanActive,
  clearLapsedBans,
  toBanInfo,
  resolveBanDuration,
  resolveBanReason,
} = require("../utils/ban");

// Removing every document that references the account, so a deletion never
// leaves an orphaned row behind. There is no active-contract or open-dispute
// guard here: an account may be deleted at any time, by an admin or by its
// owner, and the cascade takes the contracts and disputes with it.
const deleteUserData = async (userId) => {
  const projects = await Project.find({ client: userId }).select("_id");
  const projectIds = projects.map((project) => project._id);
  const contracts = await Contract.find({
    $or: [
      { client: userId },
      { freelancer: userId },
      { project: { $in: projectIds } },
    ],
  }).select("_id");
  const contractIds = contracts.map((contract) => contract._id);

  await Promise.all([
    FreelancerProfile.deleteOne({ user: userId }),
    PortfolioItem.deleteMany({ freelancer: userId }),
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
    Transaction.deleteMany({
      $or: [
        { user: userId },
        { contract: { $in: contractIds } },
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
    Notification.deleteMany({
      $or: [{ user: userId }, { actor: userId }],
    }),
    Project.deleteMany({ client: userId }),
    SavedFreelancer.deleteMany({
      $or: [{ client: userId }, { freelancer: userId }],
    }),
    Dispute.deleteMany({
      $or: [
        { raisedBy: userId },
        { against: userId },
        { contract: { $in: contractIds } },
        { project: { $in: projectIds } },
      ],
    }),
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
    // One sweep rather than a per-row check, so a temporary ban whose window has
    // passed is not still reported as "suspended" here. Nobody has to lift it by
    // hand, and the list agrees with what the login gate would decide.
    await clearLapsedBans();

    const parsedPage = req.query.page === undefined ? 1 : Number(req.query.page);
    const parsedLimit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return sendResponse(res, 400, "Invalid user pagination", null, { code: "VALIDATION_ERROR" });
    }
    const total = await User.countDocuments();
    const users = await User.find().select("-password").populate("bannedBy", "name role")
      .sort({ createdAt: -1 })
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

/**
 * Fields that are safe to show to someone who is not the account owner and is
 * not an admin. Email and wallet balance stay private.
 */
const PUBLIC_PROFILE_FIELDS = "name role bio skills profileImage createdAt updatedAt";

/**
 * Moderation is internal: a ban reason and the admin who applied it are only
 * ever shown to the account itself and to other admins. Everyone else who can
 * open a profile, including the other party of a contract, gets the same view
 * as before.
 */
const MODERATION_FIELDS = "isBanned banReason bannedAt bannedUntil bannedBy";
const SAFE_PARTY_FIELDS = `-password -${MODERATION_FIELDS.split(" ").join(" -")}`;

/**
 * Applies a ban to an account. Bans are never a side effect of anything else:
 * resolving a dispute does not ban anyone, an admin has to ask for this
 * explicitly.
 */
const banUser = async (req, res, next) => {
  try {
    if (req.user.role !== "ADMIN") {
      return sendResponse(
        res,
        403,
        "Only an admin can ban an account",
        null,
        { code: "FORBIDDEN" },
      );
    }

    if (req.params.id === req.user._id.toString()) {
      return sendResponse(res, 400, "An admin cannot ban their own account", null, {
        code: "INVALID_OPERATION",
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return sendResponse(res, 404, "User not found", null, {
        code: "USER_NOT_FOUND",
      });
    }

    if (user.role === "ADMIN") {
      return sendResponse(
        res,
        400,
        "Another admin account cannot be banned",
        null,
        { code: "INVALID_OPERATION" },
      );
    }

    if (isBanActive(user)) {
      return sendResponse(
        res,
        409,
        "This account is already banned",
        null,
        { code: "USER_ALREADY_BANNED" },
      );
    }

    const duration = resolveBanDuration(req.body.durationDays);
    if (!duration.ok) {
      return sendResponse(res, 400, duration.reason, null, {
        code: "VALIDATION_ERROR",
      });
    }

    const reason = resolveBanReason(req.body.reason);
    if (!reason.ok) {
      return sendResponse(res, 400, reason.reason, null, {
        code: "VALIDATION_ERROR",
      });
    }

    const bannedUntil = new Date(Date.now() + duration.days * DAY_MS);
    const bannedAt = new Date();

    const updated = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          isBanned: true,
          banReason: reason.value,
          bannedAt,
          bannedUntil,
          bannedBy: req.user._id,
        },
      },
      { new: true },
    ).populate("bannedBy", "name role");

    // Any token the account is still holding stops working here: the auth
    // middleware reads the ban from the database on every request.
    await createNotification({
      user: updated._id,
      actor: req.user._id,
      type: "SYSTEM",
      message: `Your account was suspended for ${duration.days} day${
        duration.days === 1 ? "" : "s"
      }${reason.value ? `: ${reason.value}` : "."}`,
      link: "/auth/login",
    });

    return sendResponse(res, 200, `${updated.name} has been banned`, {
      user: updated,
      ban: toBanInfo(updated),
    });
  } catch (error) {
    return next(error);
  }
};

const unbanUser = async (req, res, next) => {
  try {
    if (req.user.role !== "ADMIN") {
      return sendResponse(
        res,
        403,
        "Only an admin can lift a ban",
        null,
        { code: "FORBIDDEN" },
      );
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return sendResponse(res, 404, "User not found", null, {
        code: "USER_NOT_FOUND",
      });
    }

    if (!isBanActive(user)) {
      return sendResponse(res, 409, "This account is not banned", null, {
        code: "USER_NOT_BANNED",
      });
    }

    const updated = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          isBanned: false,
          banReason: "",
          bannedAt: null,
          bannedUntil: null,
          bannedBy: null,
        },
      },
      { new: true },
    ).populate("bannedBy", "name role");

    return sendResponse(res, 200, `${updated.name} can use the platform again`, {
      user: updated,
    });
  } catch (error) {
    return next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const access = await resolveProfileAccess(req.user, req.params.id);

    if (!access.allowed) {
      return sendResponse(res, 403, "You are not allowed to view this profile", null, {
        code: "FORBIDDEN",
      });
    }

    const isAdmin = req.user.role === "ADMIN";
    const query = User.findById(req.params.id);
    if (access.full) {
      query.select(isAdmin ? "-password" : SAFE_PARTY_FIELDS);
    } else {
      query.select(PUBLIC_PROFILE_FIELDS);
    }
    if (isAdmin) {
      query.populate("bannedBy", "name role");
    }

    const user = await query;

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

/**
 * Decides whether the signed-in user may open the profile of `targetId`.
 *
 * Full access (unchanged from before) for the account owner, admins and
 * contract parties. A proposal is enough to see the other party's public
 * profile, in both directions:
 *   - a client sees a freelancer who proposed on one of the client's projects
 *   - a freelancer sees the client who owns a project they applied to
 * A contract is not required for either, and only public fields are returned.
 */
const resolveProfileAccess = async (viewer, targetId) => {
  if (String(viewer._id) === String(targetId)) {
    return { allowed: true, full: true };
  }

  if (viewer.role === "ADMIN") {
    return { allowed: true, full: true };
  }

  const contract = await Contract.findOne({
    $or: [
      { client: viewer._id, freelancer: targetId },
      { freelancer: viewer._id, client: targetId },
    ],
  }).select("_id");

  if (contract) {
    return { allowed: true, full: true };
  }

  const [viewerProjects, targetProjects] = await Promise.all([
    Project.find({ client: viewer._id }).select("_id"),
    Project.find({ client: targetId }).select("_id"),
  ]);

  const proposalOnViewerProject = await Proposal.findOne({
    freelancer: targetId,
    project: { $in: viewerProjects.map((project) => project._id) },
  }).select("_id");

  if (proposalOnViewerProject) {
    return { allowed: true, full: false };
  }

  const proposalByViewer = await Proposal.findOne({
    freelancer: viewer._id,
    project: { $in: targetProjects.map((project) => project._id) },
  }).select("_id");

  if (proposalByViewer) {
    return { allowed: true, full: false };
  }

  return { allowed: false };
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
  banUser,
  unbanUser,
  deleteUserByAdmin,
  getUserById,
  getUserReviews,
};
