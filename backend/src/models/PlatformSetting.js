const mongoose = require("mongoose");

const platformSettingSchema = new mongoose.Schema(
  {
    platformFeePercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 10,
      set: (value) => Math.round(Number(value) * 10) / 10,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PlatformSetting", platformSettingSchema);