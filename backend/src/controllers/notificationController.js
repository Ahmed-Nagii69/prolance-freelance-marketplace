const Notification = require("../models/Notification");
const sendResponse = require("../utils/response");

const getNotifications = async (req, res, next) => {
  try {
    const parsedPage = req.query.page === undefined ? 1 : Number(req.query.page);
    const parsedLimit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return sendResponse(res, 400, "Invalid notification pagination", null, { code: "VALIDATION_ERROR" });
    }
    const filter = { user: req.user._id };
    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });
    const notifications = await Notification.find(filter)
      .populate("actor", "name profileImage")
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    return sendResponse(res, 200, "Notifications fetched successfully", {
      notifications,
      unreadCount,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
        hasNextPage: parsedPage * parsedLimit < total,
        hasPreviousPage: parsedPage > 1,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });
    return sendResponse(res, 200, "Unread notification count fetched successfully", {
      unreadCount,
    });
  } catch (error) {
    return next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!notification) {
      return sendResponse(res, 404, "Notification not found", null, {
        code: "NOTIFICATION_NOT_FOUND",
      });
    }
    notification.isRead = true;
    await notification.save();
    return sendResponse(res, 200, "Notification marked as read", notification);
  } catch (error) {
    return next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true },
    );
    return sendResponse(res, 200, "All notifications marked as read", null);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};