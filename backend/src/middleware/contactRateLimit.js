const sendResponse = require("../utils/response");

// The contact form is public and sends real email, so without a throttle it is
// an open relay anyone can point at the support inbox. The limit is kept in
// process memory on purpose: it is a guard against casual abuse, not a
// distributed quota, and it needs no new dependency or store to run.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

const hits = new Map();

const sweep = (now) => {
  for (const [key, stamps] of hits) {
    const live = stamps.filter((stamp) => now - stamp < WINDOW_MS);
    if (live.length === 0) {
      hits.delete(key);
    } else {
      hits.set(key, live);
    }
  }
};

/**
 * Identifies the caller for throttling.
 *
 * req.ip is used deliberately rather than the X-Forwarded-For header. The app
 * does not enable Express' `trust proxy`, so a forwarded header here would be
 * attacker-controlled and could be rotated to defeat the limit. Behind a
 * reverse proxy, enable `trust proxy` in the app so req.ip resolves to the real
 * client; until then the limit is applied per proxy address, which is stricter
 * rather than weaker.
 */
const clientKey = (req) => req.ip || req.socket?.remoteAddress || "unknown";

const contactRateLimit = (req, res, next) => {
  const now = Date.now();
  sweep(now);

  const key = clientKey(req);
  const stamps = hits.get(key) || [];

  if (stamps.length >= MAX_PER_WINDOW) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((WINDOW_MS - (now - stamps[0])) / 1000),
    );
    res.set("Retry-After", String(retryAfterSeconds));
    return sendResponse(
      res,
      429,
      "You have sent several messages recently. Please wait a few minutes and try again.",
      null,
      { code: "RATE_LIMITED" },
    );
  }

  stamps.push(now);
  hits.set(key, stamps);
  return next();
};

module.exports = contactRateLimit;
