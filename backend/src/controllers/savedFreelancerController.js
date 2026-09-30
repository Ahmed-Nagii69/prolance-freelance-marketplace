const mongoose = require("mongoose");
const User = require("../models/User");
const SavedFreelancer = require("../models/SavedFreelancer");
const sendResponse = require("../utils/response");

// Saved freelancers are listed with the same public projection the public
// profile uses, so a client never receives private account fields.
const PUBLIC_FIELDS = "name role bio skills profileImage createdAt updatedAt";

const findFreelancer = async (freelancerId) => {
  if (!mongoose.isValidObjectId(freelancerId)) {
    return null;
  }
  return User.findById(freelancerId).select("name role");
};

const toSavedItem = (entry) => {
  const freelancer = entry.freelancer;
  return {
    id: entry._id,
    savedAt: entry.createdAt,
    freelancer: {
      id: freelancer._id,
      name: freelancer.name,
      role: freelancer.role,
      bio: freelancer.bio,
      skills: freelancer.skills,
      profileImage: freelancer.profileImage,
      createdAt: freelancer.createdAt,
      updatedAt: freelancer.updatedAt,
    },
  };
};

const getSavedFreelancers = async (req, res, next) => {
  try {
    const saved = await SavedFreelancer.find({ client: req.user._id })
      .sort({ createdAt: -1 })
      .populate("freelancer", PUBLIC_FIELDS)
      .lean();

    const items = saved
      .filter((entry) => entry.freelancer)
      .map(toSavedItem);

    return sendResponse(
      res,
      200,
      "Saved freelancers fetched successfully",
      items,
    );
  } catch (error) {
    return next(error);
  }
};

const getSavedCount = async (req, res, next) => {
  try {
    const count = await SavedFreelancer.countDocuments({
      client: req.user._id,
    });

    return sendResponse(res, 200, "Saved freelancers count fetched successfully", {
      count,
    });
  } catch (error) {
    return next(error);
  }
};

const getSavedStatus = async (req, res, next) => {
  try {
    const exists = await SavedFreelancer.exists({
      client: req.user._id,
      freelancer: req.params.freelancerId,
    });

    return sendResponse(res, 200, "Saved status fetched successfully", {
      saved: Boolean(exists),
    });
  } catch (error) {
    return next(error);
  }
};

const saveFreelancer = async (req, res, next) => {
  try {
    const { freelancerId } = req.params;

    if (freelancerId === req.user._id.toString()) {
      return sendResponse(
        res,
        400,
        "You cannot save your own profile",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    const freelancer = await findFreelancer(freelancerId);
    if (!freelancer || freelancer.role !== "FREELANCER") {
      return sendResponse(res, 404, "Freelancer not found", null, {
        code: "FREELANCER_NOT_FOUND",
      });
    }

    const existing = await SavedFreelancer.findOne({
      client: req.user._id,
      freelancer: freelancer._id,
    });
    if (existing) {
      return sendResponse(
        res,
        409,
        "This freelancer is already in your saved list",
        null,
        { code: "DUPLICATE_RESOURCE" },
      );
    }

    const saved = await SavedFreelancer.create({
      client: req.user._id,
      freelancer: freelancer._id,
    });

    const created = await SavedFreelancer.findById(saved._id)
      .populate("freelancer", PUBLIC_FIELDS)
      .lean();

    return sendResponse(
      res,
      201,
      "Freelancer saved successfully",
      toSavedItem(created),
    );
  } catch (error) {
    return next(error);
  }
};

const unsaveFreelancer = async (req, res, next) => {
  try {
    const removed = await SavedFreelancer.findOneAndDelete({
      client: req.user._id,
      freelancer: req.params.freelancerId,
    });

    if (!removed) {
      return sendResponse(res, 404, "Saved freelancer not found", null, {
        code: "SAVED_FREELANCER_NOT_FOUND",
      });
    }

    return sendResponse(
      res,
      200,
      "Freelancer removed from your saved list",
      null,
    );
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getSavedFreelancers,
  getSavedCount,
  getSavedStatus,
  saveFreelancer,
  unsaveFreelancer,
};
