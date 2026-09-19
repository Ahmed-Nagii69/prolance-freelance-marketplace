const express = require("express");
const {
  createService,
  getServices,
  getServiceById,
} = require("../controllers/serviceController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", getServices);
router.get("/:id", getServiceById);
router.post("/", authMiddleware, roleMiddleware("FREELANCER"), createService);

module.exports = router;
