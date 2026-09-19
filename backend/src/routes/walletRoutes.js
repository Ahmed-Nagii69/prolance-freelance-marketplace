const express = require("express");
const {
  getWallet,
  fundWallet,
} = require("../controllers/walletController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/", getWallet);
router.post("/fund", fundWallet);

module.exports = router;