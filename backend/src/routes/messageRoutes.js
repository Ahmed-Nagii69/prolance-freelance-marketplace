const express = require("express");
const {
  sendMessage,
  getConversations,
  getProjectMessages,
  markMessageAsRead,
  getUnreadCount,
} = require("../controllers/messageController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/unread-count", getUnreadCount);
router.get("/conversations", getConversations);
router.post("/", sendMessage);
router.get("/project/:projectId", getProjectMessages);
router.patch("/:id/read", markMessageAsRead);

module.exports = router;
