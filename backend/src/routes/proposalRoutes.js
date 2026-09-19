const express = require("express");
const {
  createProposal,
  getMyProposals,
  getProjectProposals,
  getProposalById,
  acceptProposal,
  rejectProposal,
} = require("../controllers/proposalController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("FREELANCER"), createProposal);
router.get("/my", authMiddleware, roleMiddleware("FREELANCER"), getMyProposals);
router.get(
  "/projects/:projectId",
  authMiddleware,
  roleMiddleware("CLIENT"),
  getProjectProposals,
);
router.get("/:id", authMiddleware, getProposalById);
router.patch(
  "/:id/accept",
  authMiddleware,
  roleMiddleware("CLIENT"),
  acceptProposal,
);
router.patch(
  "/:id/reject",
  authMiddleware,
  roleMiddleware("CLIENT"),
  rejectProposal,
);

module.exports = router;
