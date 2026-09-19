const express = require("express");
const {
  createProject,
  getProjects,
  getProjectById,
  getMyProjects,
  updateProject,
  deleteProject,
} = require("../controllers/projectController");
const { getProjectProposals } = require("../controllers/proposalController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", getProjects);
router.get("/my", authMiddleware, roleMiddleware("CLIENT"), getMyProjects);
router.get(
  "/:projectId/proposals",
  authMiddleware,
  roleMiddleware("CLIENT"),
  getProjectProposals,
);
router.get("/:id", getProjectById);
router.post("/", authMiddleware, roleMiddleware("CLIENT"), createProject);
router.put("/:id", authMiddleware, roleMiddleware("CLIENT"), updateProject);
router.delete("/:id", authMiddleware, roleMiddleware("CLIENT"), deleteProject);

module.exports = router;
