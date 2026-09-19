const test = require("node:test");
const assert = require("node:assert/strict");

const {
  toCents,
  exceedBudgetValidation,
} = require("../src/utils/proposalValidation");

test("toCents converts dollars to integer cents", () => {
  assert.equal(toCents(50), 5000);
  assert.equal(toCents(50.5), 5050);
  assert.equal(toCents(50.555), 5056);
  assert.equal(toCents("51"), 5100);
});

test("exceedBudgetValidation allows a bid equal to the budget", () => {
  assert.equal(exceedBudgetValidation(5000, 5000), null);
  assert.equal(exceedBudgetValidation(5000, 5100), null);
});

test("exceedBudgetValidation rejects a bid above the budget", () => {
  assert.equal(
    exceedBudgetValidation(5100, 5000),
    "Your bid cannot exceed the project budget",
  );
});

test("exceedBudgetValidation rejects a bid above the budget in cents-scale", () => {
  assert.equal(exceedBudgetValidation(toCents(50.01), toCents(50)), 
    "Your bid cannot exceed the project budget");
});

test("exceedBudgetValidation allows a bid equal to the budget in cents-scale", () => {
  assert.equal(exceedBudgetValidation(toCents(49.99), toCents(50)), null);
});