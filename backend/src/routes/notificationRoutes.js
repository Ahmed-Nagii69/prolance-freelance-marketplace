const express = require("express");
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

module.exports = router;