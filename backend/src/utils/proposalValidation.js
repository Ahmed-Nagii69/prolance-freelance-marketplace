const toCents = (value) => Math.round(Number(value) * 100);

const exceedBudgetValidation = (parsedPriceCents, budgetCents) => {
  if (parsedPriceCents > budgetCents) {
    return "Your bid cannot exceed the project budget";
  }
  return null;
};

module.exports = { toCents, exceedBudgetValidation };