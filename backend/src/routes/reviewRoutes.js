const express = require("express");
const {
  createReview,
  getUserReviews,
} = require("../controllers/reviewController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, createReview);
router.get("/user/:id", authMiddleware, getUserReviews);

module.exports = router;
