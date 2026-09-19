const express = require("express");
const {
  sendMessage,
  getProjectMessages,
  markMessageAsRead,
} = require("../controllers/messageController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.post("/", sendMessage);
router.get("/project/:projectId", getProjectMessages);
router.patch("/:id/read", markMessageAsRead);

module.exports = router;
