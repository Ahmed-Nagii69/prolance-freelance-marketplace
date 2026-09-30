const User = require("../models/User");

/** Durations the admin UI offers, plus the bounds for a custom duration. */
const BAN_DURATION_PRESETS = [1, 3, 7, 30];
const BAN_MIN_DAYS = 1;
const BAN_MAX_DAYS = 365;
const MAX_REASON_LENGTH = 500;

/**
 * A ban is active when it is flagged and has not lapsed. A permanent ban has no
 * `bannedUntil`. This is the only place the decision is made, so the middleware,
 * the login handler and the admin screens can never disagree.
 */
const isBanActive = (user, now = new Date()) => {
  if (!user || !user.isBanned) {
    return false;
  }
  if (!user.bannedUntil) {
    return true;
  }
  return user.bannedUntil.getTime() > now.getTime();
};

/** Has the ban been flagged but has its window already elapsed? */
const isBanLapsed = (user, now = new Date()) =>
  Boolean(user && user.isBanned && user.bannedUntil && user.bannedUntil.getTime() <= now.getTime());

/**
 * Clears a ban whose window has passed, so a lapsed ban never has to be lifted
 * by hand and the stored document never claims a ban that is not in force.
 * Returns true when a write happened.
 */
const clearLapsedBan = async (user) => {
  if (!isBanLapsed(user)) {
    return false;
  }
  await User.findByIdAndUpdate(user._id, {
    $set: {
      isBanned: false,
      banReason: "",
      bannedAt: null,
      bannedUntil: null,
      bannedBy: null,
    },
  });
  return true;
};

/**
 * Applies the lapsed-ban rule to a freshly loaded user document and reports
 * whether a ban is still in force. A lapsed ban is reset once, so later reads
 * of the same document already describe the account as active without anyone
 * lifting it by hand.
 *
 * This is the single decision used by the request middleware, by login and by
 * the password reset that mints a session, so the three can never disagree.
 */
const refreshBanState = async (user) => {
  if (isBanLapsed(user)) {
    await clearLapsedBan(user);
    user.isBanned = false;
    user.banReason = "";
    user.bannedAt = null;
    user.bannedUntil = null;
    user.bannedBy = null;
  }
  return isBanActive(user);
};

/**
 * Sweeps every lapsed ban in the collection in a single update, so admin
 * listings and reports never show an expired ban as if it were still in force.
 * The same rule the request middleware applies per user, just batched.
 * Returns the number of documents that were reset.
 */
const clearLapsedBans = async () => {
  const result = await User.updateMany(
    { isBanned: true, bannedUntil: { $ne: null, $lte: new Date() } },
    {
      $set: {
        isBanned: false,
        banReason: "",
        bannedAt: null,
        bannedUntil: null,
        bannedBy: null,
      },
    },
  );

  return result?.modifiedCount ?? 0;
};

/**
 * The structured ban description sent to the client. It deliberately omits
 * which admin applied the ban and any internal identifiers: the member only
 * needs to know that they are suspended, why, and until when.
 */
const toBanInfo = (user) => {
  const bannedUntil = user.bannedUntil ? user.bannedUntil.toISOString() : null;
  const reason = user.banReason ? String(user.banReason) : "";

  return {
    isBanned: true,
    reason: reason || null,
    bannedAt: user.bannedAt ? user.bannedAt.toISOString() : null,
    bannedUntil,
    isPermanent: !bannedUntil,
  };
};

/**
 * Validates a requested ban duration. Accepts the presets and any custom whole
 * number of days inside the allowed window.
 */
const resolveBanDuration = (rawDuration) => {
  if (rawDuration === undefined || rawDuration === null || rawDuration === "") {
    return { ok: false, reason: "Choose how long the ban should last" };
  }
  if (typeof rawDuration !== "number" && typeof rawDuration !== "string") {
    return { ok: false, reason: "Choose how long the ban should last" };
  }

  const trimmed = String(rawDuration).trim();
  if (!/^\d{1,4}$/.test(trimmed)) {
    return { ok: false, reason: "Choose how long the ban should last" };
  }

  const days = Number(trimmed);
  if (!Number.isInteger(days) || days < BAN_MIN_DAYS || days > BAN_MAX_DAYS) {
    return {
      ok: false,
      reason: `Ban duration must be between ${BAN_MIN_DAYS} and ${BAN_MAX_DAYS} days`,
    };
  }

  return { ok: true, days };
};

const resolveBanReason = (rawReason) => {
  if (rawReason === undefined || rawReason === null) {
    return { ok: true, value: "" };
  }
  if (typeof rawReason !== "string") {
    return { ok: false, reason: "The reason must be text" };
  }
  const value = rawReason.trim();
  if (value.length > MAX_REASON_LENGTH) {
    return {
      ok: false,
      reason: `The reason must be ${MAX_REASON_LENGTH} characters or fewer`,
    };
  }
  return { ok: true, value };
};

module.exports = {
  BAN_DURATION_PRESETS,
  BAN_MIN_DAYS,
  BAN_MAX_DAYS,
  MAX_REASON_LENGTH,
  isBanActive,
  isBanLapsed,
  clearLapsedBan,
  clearLapsedBans,
  refreshBanState,
  toBanInfo,
  resolveBanDuration,
  resolveBanReason,
};
