const Review = require("../models/Review");
const Contract = require("../models/Contract");
const sendResponse = require("../utils/response");
const { createNotification } = require("../utils/notify");

const createReview = async (req, res, next) => {
  try {
    const { contract, rating, comment } = req.body;

    const parsedRating = Number(rating);
    if (
      !contract ||
      !Number.isInteger(parsedRating) ||
      parsedRating < 1 ||
      parsedRating > 5 ||
      typeof comment !== "string" ||
      !comment.trim() ||
      comment.length > 2000
    ) {
      return sendResponse(
        res,
        400,
        "Contract, rating and comment are required",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    const contractData = await Contract.findById(contract);
    if (!contractData) {
      return sendResponse(res, 404, "Contract not found", null, {
        code: "CONTRACT_NOT_FOUND",
      });
    }

    if (contractData.status !== "COMPLETED") {
      return sendResponse(
        res,
        400,
        "You can only review completed contracts",
        null,
        { code: "INVALID_REVIEW" },
      );
    }

    const canReview =
      contractData.client.toString() === req.user._id.toString() ||
      contractData.freelancer.toString() === req.user._id.toString();

    if (!canReview) {
      return sendResponse(
        res,
        403,
        "You are not allowed to review this contract",
        null,
        { code: "FORBIDDEN" },
      );
    }

    const reviewee =
      contractData.client.toString() === req.user._id.toString()
        ? contractData.freelancer
        : contractData.client;

    if (reviewee.toString() === req.user._id.toString()) {
      return sendResponse(res, 400, "You cannot review yourself", null, {
        code: "INVALID_REVIEW",
      });
    }

    const existingReview = await Review.findOne({
      contract,
      reviewer: req.user._id,
    });
    if (existingReview) {
      return sendResponse(
        res,
        409,
        "You already reviewed this contract",
        null,
        { code: "REVIEW_EXISTS" },
      );
    }

    const review = await Review.create({
      contract,
      reviewer: req.user._id,
      reviewee,
      rating: parsedRating,
      comment: comment.trim(),
    });

    await createNotification({
      user: reviewee,
      actor: req.user._id,
      type: "REVIEW",
      message: `${req.user.name} left you a ${parsedRating}-star review`,
      link: `/users/${reviewee}`,
    });

    return sendResponse(res, 201, "Review created successfully", review);
  } catch (error) {
    return next(error);
  }
};

const getContractReviewStatus = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.contractId);

    if (!contract) {
      return sendResponse(res, 404, "Contract not found", null, {
        code: "CONTRACT_NOT_FOUND",
      });
    }

    const isParty =
      contract.client.toString() === req.user._id.toString() ||
      contract.freelancer.toString() === req.user._id.toString();
    if (!isParty) {
      return sendResponse(
        res,
        403,
        "You are not allowed to view reviews for this contract",
        null,
        { code: "FORBIDDEN" },
      );
    }

    const existingReview = await Review.findOne({
      contract: req.params.contractId,
      reviewer: req.user._id,
    }).select("_id");

    return sendResponse(res, 200, "Review status fetched successfully", {
      reviewed: Boolean(existingReview),
    });
  } catch (error) {
    return next(error);
  }
};

const getUserReviews = async (req, res, next) => {
  try {
    const parsedPage = req.query.page === undefined ? 1 : Number(req.query.page);
    const parsedLimit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return sendResponse(res, 400, "Invalid review pagination", null, { code: "VALIDATION_ERROR" });
    }
    const filter = { reviewee: req.params.id };
    const total = await Review.countDocuments(filter);
    const reviews = await Review.find(filter)
      .populate("reviewer", "name role")
      .populate("reviewee", "name role")
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    return sendResponse(res, 200, "User reviews fetched successfully", {
      reviews,
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

module.exports = {
  createReview,
  getContractReviewStatus,
  getUserReviews,
};
