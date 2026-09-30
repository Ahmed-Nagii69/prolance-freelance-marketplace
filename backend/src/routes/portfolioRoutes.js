const express = require("express");
const {
  getMyPortfolio,
  getFreelancerPortfolio,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  uploadPortfolioImage,
} = require("../controllers/portfolioController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { uploadPhoto } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/my", roleMiddleware("FREELANCER"), getMyPortfolio);
router.post("/image", roleMiddleware("FREELANCER"), uploadPhoto, uploadPortfolioImage);
router.post("/", roleMiddleware("FREELANCER"), createPortfolioItem);
router.get("/user/:freelancerId", getFreelancerPortfolio);
router.put("/:id", roleMiddleware("FREELANCER"), updatePortfolioItem);
router.delete("/:id", roleMiddleware("FREELANCER"), deletePortfolioItem);

module.exports = router;
