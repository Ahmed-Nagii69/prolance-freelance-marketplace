const express = require("express");
const {
  createReview,
  getContractReviewStatus,
  getUserReviews,
} = require("../controllers/reviewController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, createReview);
router.get("/contract/:contractId/me", authMiddleware, getContractReviewStatus);
router.get("/user/:id", authMiddleware, getUserReviews);

module.exports = router;
