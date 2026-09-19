const User = require("../models/User");
const Transaction = require("../models/Transaction");
const sendResponse = require("../utils/response");
const { changeBalance } = require("../utils/ledger");

const getWallet = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    const transactions = await Transaction.find({ user: req.user._id })
      .populate("contract", "status")
      .populate("project", "title")
      .sort({ createdAt: -1 })
      .limit(50);

    return sendResponse(res, 200, "Wallet fetched successfully", {
      balance: user.balance,
      transactions,
    });
  } catch (error) {
    return next(error);
  }
};

const fundWallet = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 100000) {
      return sendResponse(
        res,
        400,
        "A positive amount up to 100000 is required",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    await changeBalance({
      userId: req.user._id,
      type: "CREDIT",
      amount: parsedAmount,
      description: "Dummy funds added to wallet",
    });

    const user = await User.findById(req.user._id).select("-password");
    return sendResponse(res, 200, "Funds added to your wallet", {
      balance: user.balance,
      amount: Math.round(parsedAmount * 100) / 100,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getWallet,
  fundWallet,
};