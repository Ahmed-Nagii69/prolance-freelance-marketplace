const express = require("express");
const {
  getSavedFreelancers,
  getSavedCount,
  getSavedStatus,
  saveFreelancer,
  unsaveFreelancer,
} = require("../controllers/savedFreelancerController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, roleMiddleware("CLIENT"));

router.get("/", getSavedFreelancers);
router.get("/count", getSavedCount);
router.get("/:freelancerId", getSavedStatus);
router.post("/:freelancerId", saveFreelancer);
router.delete("/:freelancerId", unsaveFreelancer);

module.exports = router;
