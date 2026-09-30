/**
 * Single source of truth for the bid range that ProLance allows.
 *
 * A project states its own budget range (`minBudget`..`maxBudget`), and that
 * stored range is exactly the range a bid may fall into:
 *
 *   min = clamp(project.minBudget)
 *   max = clamp(project.maxBudget)
 *
 * The client never re-derives these numbers. It reads the resolved range from
 * `GET /api/proposals/limits/:projectId`, so the numbers the form shows are the
 * numbers the API accepts and there is a single definition on the server.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Absolute floor: no bid is ever worth less than one unit of currency. */
const MIN_AMOUNT = 1;

/** Absolute ceiling: guards against absurd values and numeric overflow. */
const MAX_AMOUNT = 1_000_000;

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const isSubCent = (value) => Math.abs(round2(value) - value) > 1e-9;

const formatMoney = (value) =>
  `${Math.trunc(value).toLocaleString("en-US")}` +
  (Number.isInteger(round2(value))
    ? ""
    : `.${String(Math.round(round2(value) % 1 * 100)).padStart(2, "0")}`);

/**
 * Coerces a stored budget bound into a usable number. A malformed or negative
 * bound collapses to the absolute floor rather than propagating NaN into a
 * comparison, where every price would silently pass.
 */
const sanitizeBound = (raw) => {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return MIN_AMOUNT;
  }
  return round2(Math.min(value, MAX_AMOUNT));
};

/**
 * Resolves the numeric range allowed for bids on a project that declares
 * `minBudget`/`maxBudget`. Always returns a usable range, even when the stored
 * bounds are malformed or inverted.
 */
const resolveProposalRange = (minBudget, maxBudget) => {
  const min = sanitizeBound(minBudget);
  const max = sanitizeBound(maxBudget);

  // A project whose stored bounds are inverted would tell a client that the
  // minimum is above the maximum. Collapse it so the range is always orderable.
  if (max < min) {
    return { min, max: min };
  }

  return { min, max };
};

/**
 * Parses a submitted price into a positive number of cents-precision.
 *
 * Returns `{ ok: true, value }` or `{ ok: false, reason }`. The parser is
 * deliberately strict about the input type: `Number(true)` is 1 and
 * `Number([5])` is 5, so a JSON body could otherwise smuggle a non-numeric
 * value past a naive check.
 */
const parseProposalPrice = (raw) => {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) {
      return { ok: false, reason: "Enter a valid amount" };
    }
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { ok: false, reason: "Enter a valid amount" };
    }
    if (!/^-?\d*\.?\d*$/.test(trimmed) || !/\d/.test(trimmed)) {
      return { ok: false, reason: "Amount must be a number" };
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return { ok: false, reason: "Enter a valid amount" };
    }
  } else {
    return { ok: false, reason: "Enter a valid amount" };
  }

  const value = Number(raw);

  if (value <= 0) {
    return { ok: false, reason: "Amount must be greater than zero" };
  }
  if (isSubCent(value)) {
    return { ok: false, reason: "Use no more than 2 decimal places" };
  }

  return { ok: true, value: round2(value) };
};

/**
 * The one validation used by both proposal creation and the single allowed
 * edit, so the two paths can never drift apart.
 */
const validateProposalPrice = (raw, minBudget, maxBudget) => {
  const parsed = parseProposalPrice(raw);
  if (!parsed.ok) {
    return parsed;
  }

  const { min, max } = resolveProposalRange(minBudget, maxBudget);

  if (parsed.value < min) {
    return {
      ok: false,
      reason: `Your bid must be at least ${formatMoney(min)}`,
      min,
      max,
    };
  }
  if (parsed.value > max) {
    return {
      ok: false,
      reason: `Your bid cannot exceed ${formatMoney(max)}`,
      min,
      max,
    };
  }

  return { ok: true, value: parsed.value, min, max };
};

module.exports = {
  DAY_MS,
  MIN_AMOUNT,
  MAX_AMOUNT,
  round2,
  isSubCent,
  formatMoney,
  resolveProposalRange,
  parseProposalPrice,
  validateProposalPrice,
};
