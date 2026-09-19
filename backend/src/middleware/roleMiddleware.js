const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        error: { code: "UNAUTHORIZED" },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient role permissions",
        data: null,
        error: { code: "FORBIDDEN" },
      });
    }

    next();
  };
};

module.exports = roleMiddleware;
