const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { refreshBanState, toBanInfo } = require("../utils/ban");

/**
 * The single gate for every authenticated request.
 *
 * The role is always read from the database rather than the token, so a role
 * change or a ban takes effect on the very next request even though the token
 * itself is still valid. A banned user is rejected here, before any controller
 * runs, which covers proposals, projects, contracts, disputes, messages,
 * notifications, saved freelancers, the wallet and the profile alike.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing or invalid",
        data: null,
        error: { code: "UNAUTHORIZED" },
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
        data: null,
        error: { code: "UNAUTHORIZED" },
      });
    }

    // A ban whose window has passed lapses on its own, and a ban still in force
    // is refused here, before any controller runs. Because the role is read from
    // the database too, this single check covers proposals, projects, contracts,
    // disputes, messages, notifications, saved freelancers, the wallet and the
    // profile alike, and takes effect on the member's very next request even
    // though their token has not expired.
    if (await refreshBanState(user)) {
      return res.status(403).json({
        success: false,
        message: "Your account is temporarily suspended",
        data: { ban: toBanInfo(user) },
        error: { code: "ACCOUNT_BANNED" },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      data: null,
      error: { code: "UNAUTHORIZED" },
    });
  }
};

module.exports = authMiddleware;
