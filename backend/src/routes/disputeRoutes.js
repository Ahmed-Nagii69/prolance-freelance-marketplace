const express = require("express");
const {
  getDisputes,
  reviewDispute,
  resolveDispute,
} = require("../controllers/disputeController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, roleMiddleware("ADMIN"));

router.get("/", getDisputes);
router.patch("/:id/review", reviewDispute);
router.patch("/:id/resolve", resolveDispute);

module.exports = router;
