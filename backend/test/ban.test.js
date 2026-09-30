const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isBanActive,
  isBanLapsed,
  toBanInfo,
  resolveBanDuration,
  resolveBanReason,
  BAN_MAX_DAYS,
} = require("../src/utils/ban");

const future = (ms) => new Date(Date.now() + ms);
const past = (ms) => new Date(Date.now() - ms);

test("a user who was never banned is not banned", () => {
  assert.equal(isBanActive({ isBanned: false }), false);
  assert.equal(isBanActive(null), false);
  assert.equal(isBanActive(undefined), false);
});

test("a permanent ban stays active with no expiry", () => {
  const user = { isBanned: true, bannedUntil: null };
  assert.equal(isBanActive(user), true);
});

test("a temporary ban is active until it expires", () => {
  const user = { isBanned: true, bannedUntil: future(60_000) };
  assert.equal(isBanActive(user), true);
  assert.equal(isBanLapsed(user), false);
});

test("a temporary ban stops being active once it expires", () => {
  const user = { isBanned: true, bannedUntil: past(60_000) };
  assert.equal(isBanActive(user), false);
  assert.equal(isBanLapsed(user), true);
});

test("a ban that expires exactly now counts as lapsed", () => {
  const user = { isBanned: true, bannedUntil: new Date(Date.now()) };
  assert.equal(isBanActive(user, new Date(user.bannedUntil.getTime() + 1)), false);
});

test("toBanInfo reports the reason and expiry without admin internals", () => {
  const info = toBanInfo({
    isBanned: true,
    banReason: "Repeated spam",
    bannedAt: new Date("2026-01-01T00:00:00.000Z"),
    bannedUntil: new Date("2026-01-08T00:00:00.000Z"),
    bannedBy: "some-admin-object-id",
  });

  assert.equal(info.isBanned, true);
  assert.equal(info.reason, "Repeated spam");
  assert.equal(info.isPermanent, false);
  assert.equal(info.bannedUntil, "2026-01-08T00:00:00.000Z");
  assert.equal(info.bannedAt, "2026-01-01T00:00:00.000Z");
  assert.equal("bannedBy" in info, false, "the admin must not be exposed");
});

test("toBanInfo normalises a missing reason to null", () => {
  const info = toBanInfo({ isBanned: true, banReason: "", bannedUntil: null });
  assert.equal(info.reason, null);
  assert.equal(info.isPermanent, true);
});

test("resolveBanDuration accepts the presets and custom whole days", () => {
  for (const days of [1, 3, 7, 30, 14, BAN_MAX_DAYS]) {
    assert.deepEqual(resolveBanDuration(days), { ok: true, days });
    assert.deepEqual(resolveBanDuration(String(days)), { ok: true, days });
  }
});

test("resolveBanDuration rejects anything outside the window", () => {
  const bad = [
    undefined,
    null,
    "",
    "   ",
    0,
    -3,
    BAN_MAX_DAYS + 1,
    1.5,
    "3.5",
    "abc",
    "1e2",
    true,
    [],
    {},
    100000,
  ];
  for (const value of bad) {
    const result = resolveBanDuration(value);
    assert.equal(result.ok, false, `expected ${JSON.stringify(value)} to be rejected`);
    assert.equal(typeof result.reason, "string");
  }
});

test("resolveBanReason trims, allows empty, and caps the length", () => {
  assert.deepEqual(resolveBanReason("  spam  "), { ok: true, value: "spam" });
  assert.deepEqual(resolveBanReason(undefined), { ok: true, value: "" });
  assert.deepEqual(resolveBanReason("   "), { ok: true, value: "" });
  assert.equal(resolveBanReason("x".repeat(501)).ok, false);
  assert.equal(resolveBanReason(42).ok, false);
});
