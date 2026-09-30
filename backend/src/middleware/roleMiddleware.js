/**
 * Role gate for a route.
 *
 * `roleMiddleware("CLIENT")` on a route is the first line of defence. Handlers
 * also call `hasRole` themselves for the rules that must not depend on how a
 * route happens to be wired: only a client may post or manage a project, for
 * example, and that has to hold even if a route later picks up a broader
 * permission by mistake.
 */
const hasRole = (user, ...roles) => Boolean(user) && roles.includes(user.role);

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
module.exports.roleMiddleware = roleMiddleware;
module.exports.hasRole = hasRole;
