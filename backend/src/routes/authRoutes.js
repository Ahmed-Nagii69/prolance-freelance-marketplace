const express = require("express");
const {
  register,
  login,
  changePassword,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);
router.patch("/change-password", authMiddleware, changePassword);

module.exports = router;
