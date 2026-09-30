const test = require("node:test");
const assert = require("node:assert/strict");

const {
  MIN_AMOUNT,
  MAX_AMOUNT,
  resolveProposalRange,
  parseProposalPrice,
  validateProposalPrice,
} = require("../src/config/proposalBudget");

test("resolveProposalRange uses the project's stored range", () => {
  const { min, max } = resolveProposalRange(1500, 2200);
  assert.equal(min, 1500);
  assert.equal(max, 2200);
});

test("resolveProposalRange never returns a minimum above the maximum", () => {
  // Inverted stored bounds must still produce an orderable range.
  const { min, max } = resolveProposalRange(2200, 1500);
  assert.ok(min <= max, `expected ${min} <= ${max}`);
  assert.equal(max, min);
});

test("resolveProposalRange survives a malformed bound", () => {
  for (const bad of [undefined, null, "abc", NaN, -10, {}]) {
    const { min, max } = resolveProposalRange(bad, bad);
    assert.equal(min, MIN_AMOUNT);
    assert.equal(max, MIN_AMOUNT);
  }
});

test("resolveProposalRange clamps a bound to the absolute ceiling", () => {
  const { max } = resolveProposalRange(1, 50_000_000);
  assert.equal(max, MAX_AMOUNT);
});

test("parseProposalPrice rejects values that are not real money", () => {
  const bad = [
    undefined,
    null,
    "",
    "   ",
    "abc",
    "12abc",
    "1,200",
    true,
    false,
    [],
    [5],
    {},
    NaN,
    Infinity,
    -Infinity,
  ];
  for (const value of bad) {
    const result = parseProposalPrice(value);
    assert.equal(result.ok, false, `expected ${JSON.stringify(value)} to be rejected`);
  }
});

test("parseProposalPrice rejects zero and negative amounts", () => {
  assert.equal(parseProposalPrice(0).ok, false);
  assert.equal(parseProposalPrice("0").ok, false);
  assert.equal(parseProposalPrice(-1).ok, false);
  assert.equal(parseProposalPrice("-0.01").ok, false);
});

test("parseProposalPrice rejects more than two decimal places", () => {
  assert.equal(parseProposalPrice(10.005).ok, false);
  assert.equal(parseProposalPrice("10.005").ok, false);
  assert.equal(parseProposalPrice("10.001").ok, false);
  assert.equal(parseProposalPrice(10.01).ok, true);
  assert.equal(parseProposalPrice(10.1).ok, true);
});

test("parseProposalPrice accepts numeric strings and rounds to cents", () => {
  assert.deepEqual(parseProposalPrice("250.50"), { ok: true, value: 250.5 });
  assert.deepEqual(parseProposalPrice(250), { ok: true, value: 250 });
  assert.deepEqual(parseProposalPrice(" 90.99 "), { ok: true, value: 90.99 });
});

test("validateProposalPrice enforces the lower bound", () => {
  const result = validateProposalPrice(1499, 1500, 2200);
  assert.equal(result.ok, false);
  assert.match(result.reason, /at least/);
});

test("validateProposalPrice enforces the maximum as the upper bound", () => {
  const result = validateProposalPrice(2200.01, 1500, 2200);
  assert.equal(result.ok, false);
  assert.match(result.reason, /cannot exceed/);
});

test("validateProposalPrice allows a bid exactly on both bounds", () => {
  assert.equal(validateProposalPrice(1500, 1500, 2200).ok, true);
  assert.equal(validateProposalPrice(2200, 1500, 2200).ok, true);
  assert.equal(validateProposalPrice(1800, 1500, 2200).ok, true);
});

test("validateProposalPrice rejects an absurdly large bid", () => {
  assert.equal(validateProposalPrice(1e12, 1, 1e13).ok, false);
});
