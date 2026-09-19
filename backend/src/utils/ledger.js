const User = require("../models/User");
const Transaction = require("../models/Transaction");

const raiseError = (message, statusCode = 400, code = "REQUEST_ERROR") => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  throw err;
};

const changeBalance = async ({ userId, type, amount, contract, project, description }) => {
  const user = await User.findById(userId);
  if (!user) {
    raiseError("User not found", 404, "USER_NOT_FOUND");
  }
  const safeAmount = Math.round(amount * 100) / 100;
  const signed = type === "CREDIT" ? safeAmount : -safeAmount;
  const nextBalance = Math.round((user.balance + signed) * 100) / 100;
  if (nextBalance < 0) {
    raiseError("Insufficient balance", 400, "INSUFFICIENT_BALANCE");
  }
  user.balance = nextBalance;
  await user.save();
  await Transaction.create({
    user: userId,
    type,
    amount: safeAmount,
    balanceAfter: nextBalance,
    contract: contract || null,
    project: project || null,
    description,
  });
  return { balanceAfter: nextBalance, user };
};

module.exports = { changeBalance };