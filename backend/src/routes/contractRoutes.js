const express = require("express");
const {
  getContracts,
  getContractById,
  completeContract,
  cancelContract,
} = require("../controllers/contractController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/", getContracts);
router.get("/:id", getContractById);
router.patch("/:id/complete", completeContract);
router.patch("/:id/cancel", cancelContract);

module.exports = router;
