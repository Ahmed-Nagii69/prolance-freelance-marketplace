const express = require("express");
const {
  getContracts,
  getContractById,
  submitWork,
  approveWork,
  rejectWork,
  cancelContract,
} = require("../controllers/contractController");
const {
  openDispute,
  getDisputeForContract,
} = require("../controllers/disputeController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/", getContracts);
router.get("/:id", getContractById);
router.patch("/:id/submit-work", submitWork);
router.patch("/:id/approve-work", approveWork);
router.patch("/:id/reject-work", rejectWork);
// A contract only reaches COMPLETED through the delivery flow: the freelancer
// submits work and the client approves it (see `approveWork`). There is no
// generic "mark complete" route, so funds can never be released without a
// submission the client has accepted.
router.patch("/:id/cancel", cancelContract);
router.get("/:id/dispute", getDisputeForContract);
router.post("/:id/dispute", openDispute);

module.exports = router;