const PlatformSetting = require("../models/PlatformSetting");
const sendResponse = require("../utils/response");

const toPercent = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 10;
};

const getPlatformSettings = async (req, res, next) => {
  try {
    let setting = await PlatformSetting.findOne().sort({ createdAt: 1 }).lean();
    if (!setting) {
      setting = await PlatformSetting.create({ platformFeePercent: 10 });
    }
    return sendResponse(res, 200, "Platform settings fetched successfully", {
      platformFeePercent: toPercent(setting.platformFeePercent),
    });
  } catch (error) {
    return next(error);
  }
};

const updatePlatformSettings = async (req, res, next) => {
  try {
    const { platformFeePercent } = req.body;
    const parsed = Number(platformFeePercent);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      return sendResponse(
        res,
        400,
        "Platform fee percentage must be a number between 0 and 100",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }
    const rounded = Math.round(parsed * 10) / 10;

    let setting = await PlatformSetting.findOne().sort({ createdAt: 1 });
    if (!setting) {
      setting = await PlatformSetting.create({ platformFeePercent: rounded });
    } else {
      setting.platformFeePercent = rounded;
      await setting.save();
    }

    return sendResponse(res, 200, "Platform settings updated successfully", {
      platformFeePercent: toPercent(setting.platformFeePercent),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getPlatformSettings,
  updatePlatformSettings,
};