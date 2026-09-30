const express = require("express");
const {
  createProposal,
  updateProposal,
  getProposalLimits,
  getMyProposals,
  getProjectProposals,
  getProposalById,
  markProposalAsSeen,
  acceptProposal,
  rejectProposal,
} = require("../controllers/proposalController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("FREELANCER"), createProposal);
router.get("/my", authMiddleware, roleMiddleware("FREELANCER"), getMyProposals);
router.get(
  "/limits/:projectId",
  authMiddleware,
  roleMiddleware("FREELANCER"),
  getProposalLimits,
);
router.get(
  "/projects/:projectId",
  authMiddleware,
  roleMiddleware("CLIENT"),
  getProjectProposals,
);
router.get("/:id", authMiddleware, getProposalById);
// The single allowed revision of a bid. The controller repeats the ownership,
// status and budget checks, and the write is conditional, so a second edit
// cannot slip through even from two concurrent requests.
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("FREELANCER"),
  updateProposal,
);
// Client-side read state for the All / Seen / Unseen filters. Only the client
// who owns the project may set it, and only that one flag is written.
router.patch(
  "/:id/seen",
  authMiddleware,
  roleMiddleware("CLIENT"),
  markProposalAsSeen,
);
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
