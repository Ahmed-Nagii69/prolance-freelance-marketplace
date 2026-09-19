const express = require("express");
const {
  createSkill,
  getSkills,
  getSkillById,
} = require("../controllers/skillController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", getSkills);
router.get("/:id", getSkillById);
router.post("/", authMiddleware, roleMiddleware("ADMIN"), createSkill);

module.exports = router;
