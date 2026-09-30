const User = require("../models/User");
const PortfolioItem = require("../models/PortfolioItem");
const sendResponse = require("../utils/response");

const MAX_ITEMS = 24;
const MAX_TECHNOLOGIES = 15;
const URL_PATTERN = /^(https?:\/\/|\/)/i;

const cleanText = (value, maxLength) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > maxLength) return null;
  return trimmed;
};

const cleanUrl = (value) => {
  const cleaned = cleanText(value, 500);
  if (cleaned === null) return null;
  if (cleaned && !URL_PATTERN.test(cleaned)) return null;
  return cleaned;
};

/**
 * Builds a validated, partial set of portfolio fields from a request body.
 * Only the keys that were actually provided end up in the result.
 */
const parseItemFields = (body) => {
  const fields = {};

  if (body.title !== undefined) {
    const title = cleanText(body.title, 120);
    if (!title) {
      return { error: "A portfolio item needs a title (max 120 characters)" };
    }
    fields.title = title;
  }

  if (body.description !== undefined) {
    const description = cleanText(body.description, 1200);
    if (!description) {
      return {
        error: "A portfolio item needs a description (max 1200 characters)",
      };
    }
    fields.description = description;
  }

  if (body.image !== undefined) {
    const image = cleanUrl(body.image);
    if (image === null) {
      return { error: "The image must be a valid http(s) link" };
    }
    fields.image = image;
  }

  if (body.category !== undefined) {
    const category = cleanText(body.category, 60);
    if (category === null) {
      return { error: "The category is too long (max 60 characters)" };
    }
    fields.category = category;
  }

  if (body.technologies !== undefined) {
    if (!Array.isArray(body.technologies)) {
      return { error: "Technologies must be a list of names" };
    }
    const technologies = body.technologies
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .slice(0, MAX_TECHNOLOGIES);
    fields.technologies = technologies;
  }

  if (body.projectUrl !== undefined) {
    const projectUrl = cleanUrl(body.projectUrl);
    if (projectUrl === null) {
      return { error: "The project link must be a valid http(s) link" };
    }
    fields.projectUrl = projectUrl;
  }

  if (body.linkUrl !== undefined) {
    const linkUrl = cleanUrl(body.linkUrl);
    if (linkUrl === null) {
      return { error: "The additional link must be a valid http(s) link" };
    }
    fields.linkUrl = linkUrl;
  }

  if (body.linkLabel !== undefined) {
    const linkLabel = cleanText(body.linkLabel, 40);
    if (linkLabel === null) {
      return { error: "The link label is too long (max 40 characters)" };
    }
    fields.linkLabel = linkLabel;
  }

  return { fields };
};

const getMyPortfolio = async (req, res, next) => {
  try {
    const items = await PortfolioItem.find({ freelancer: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return sendResponse(res, 200, "Portfolio fetched successfully", items);
  } catch (error) {
    return next(error);
  }
};

const getFreelancerPortfolio = async (req, res, next) => {
  try {
    const freelancer = await User.findById(req.params.freelancerId).select(
      "name role",
    );

    if (!freelancer || freelancer.role !== "FREELANCER") {
      return sendResponse(res, 404, "Freelancer not found", null, {
        code: "FREELANCER_NOT_FOUND",
      });
    }

    const items = await PortfolioItem.find({ freelancer: freelancer._id })
      .select("-freelancer")
      .sort({ createdAt: -1 })
      .lean();

    return sendResponse(res, 200, "Portfolio fetched successfully", items);
  } catch (error) {
    return next(error);
  }
};

const createPortfolioItem = async (req, res, next) => {
  try {
    const { fields, error: validationError } = parseItemFields(req.body);
    if (validationError) {
      return sendResponse(res, 400, validationError, null, {
        code: "VALIDATION_ERROR",
      });
    }

    if (!fields.title || !fields.description) {
      return sendResponse(
        res,
        400,
        "Title and description are required",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    const total = await PortfolioItem.countDocuments({
      freelancer: req.user._id,
    });
    if (total >= MAX_ITEMS) {
      return sendResponse(
        res,
        409,
        `A portfolio can hold at most ${MAX_ITEMS} items`,
        null,
        { code: "PORTFOLIO_LIMIT_REACHED" },
      );
    }

    const item = await PortfolioItem.create({
      ...fields,
      freelancer: req.user._id,
    });

    return sendResponse(res, 201, "Portfolio item created successfully", item);
  } catch (error) {
    return next(error);
  }
};

const updatePortfolioItem = async (req, res, next) => {
  try {
    const { fields, error: validationError } = parseItemFields(req.body);
    if (validationError) {
      return sendResponse(res, 400, validationError, null, {
        code: "VALIDATION_ERROR",
      });
    }

    if (Object.keys(fields).length === 0) {
      return sendResponse(res, 400, "No portfolio changes were provided", null, {
        code: "VALIDATION_ERROR",
      });
    }

    // The freelancer is always taken from the authenticated user, so a
    // portfolio item can never be moved to or edited by another account.
    const item = await PortfolioItem.findOneAndUpdate(
      { _id: req.params.id, freelancer: req.user._id },
      { $set: fields },
      { new: true, runValidators: true },
    );

    if (!item) {
      return sendResponse(res, 404, "Portfolio item not found", null, {
        code: "PORTFOLIO_ITEM_NOT_FOUND",
      });
    }

    return sendResponse(res, 200, "Portfolio item updated successfully", item);
  } catch (error) {
    return next(error);
  }
};

const deletePortfolioItem = async (req, res, next) => {
  try {
    const item = await PortfolioItem.findOneAndDelete({
      _id: req.params.id,
      freelancer: req.user._id,
    });

    if (!item) {
      return sendResponse(res, 404, "Portfolio item not found", null, {
        code: "PORTFOLIO_ITEM_NOT_FOUND",
      });
    }

    return sendResponse(res, 200, "Portfolio item deleted successfully", null);
  } catch (error) {
    return next(error);
  }
};

const uploadPortfolioImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendResponse(res, 400, "No image file provided", null, {
        code: "VALIDATION_ERROR",
      });
    }

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    return sendResponse(res, 200, "Image uploaded successfully", {
      image: imageUrl,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyPortfolio,
  getFreelancerPortfolio,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  uploadPortfolioImage,
};
