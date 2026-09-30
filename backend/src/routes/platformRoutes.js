const express = require("express");
const {
  getPlatformSettings,
  updatePlatformSettings,
} = require("../controllers/platformController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/", getPlatformSettings);
router.put("/", roleMiddleware("ADMIN"), updatePlatformSettings);

module.exports = router;