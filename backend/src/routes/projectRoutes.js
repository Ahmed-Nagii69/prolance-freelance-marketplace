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
const { getProjectDispute } = require("../controllers/disputeController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Public browsing stays open; everything that touches an account or writes data
// goes through authMiddleware first, and the project mutations are CLIENT only.
router.get("/", getProjects);
router.get("/my", authMiddleware, roleMiddleware("CLIENT"), getMyProjects);
// Same handler as GET /api/proposals/projects/:projectId, reachable from the
// resource the proposals belong to. Only the project's own client is served.
router.get(
  "/:projectId/proposals",
  authMiddleware,
  roleMiddleware("CLIENT"),
  getProjectProposals,
);
// The dispute behind a project is private to the two parties and an admin, so
// this sits behind auth even though GET /:id stays public. Declared before the
// "/:id" route so the extra segment is not read as an id.
router.get("/:id/dispute", authMiddleware, getProjectDispute);
router.get("/:id", getProjectById);
router.post("/", authMiddleware, roleMiddleware("CLIENT"), createProject);
router.put("/:id", authMiddleware, roleMiddleware("CLIENT"), updateProject);
router.delete("/:id", authMiddleware, roleMiddleware("CLIENT"), deleteProject);

module.exports = router;
