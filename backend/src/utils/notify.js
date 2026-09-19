const Notification = require("../models/Notification");

const createNotification = async ({ user, actor, type, message, link }) => {
  if (!user) {
    return;
  }
  try {
    await Notification.create({
      user,
      actor: actor || null,
      type,
      message,
      link: link || "",
    });
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }
};

module.exports = { createNotification };