const express = require("express");
const {
  getAnalytics,
  getFreelancerAnalytics,
  getClientAnalytics,
} = require("../controllers/analyticsController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/", roleMiddleware("ADMIN"), getAnalytics);
router.get("/freelancer", roleMiddleware("FREELANCER"), getFreelancerAnalytics);
router.get("/client", roleMiddleware("CLIENT"), getClientAnalytics);

module.exports = router;
