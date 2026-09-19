const express = require("express");
const {
  getProfile,
  updateProfile,
  getFreelancerProfile,
  updateFreelancerProfile,
  deleteAccount,
  getAllUsers,
  deleteUserByAdmin,
  getUserById,
  getUserReviews,
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.get("/freelancer-profile", roleMiddleware("FREELANCER"), getFreelancerProfile);
router.put("/freelancer-profile", roleMiddleware("FREELANCER"), updateFreelancerProfile);
router.delete("/account", deleteAccount);
router.get("/admin/all", roleMiddleware("ADMIN"), getAllUsers);
router.get("/admin/:id", roleMiddleware("ADMIN"), getUserById);
router.delete("/admin/:id", roleMiddleware("ADMIN"), deleteUserByAdmin);
router.get("/:id/reviews", getUserReviews);
router.get("/:id", getUserById);

module.exports = router;
