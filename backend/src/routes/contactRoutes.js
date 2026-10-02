const express = require("express");
const { sendContactMessage } = require("../controllers/contactController");
const contactRateLimit = require("../middleware/contactRateLimit");

const router = express.Router();

// Deliberately public: the page is reachable without an account, so no
// authMiddleware here.
router.post("/", contactRateLimit, sendContactMessage);

module.exports = router;
