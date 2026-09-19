const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)
      ? ext
      : ".jpg";
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExt}`;
    cb(null, name);
  },
});

const uploadPhoto = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
}).single("photo");

module.exports = { uploadPhoto, UPLOAD_DIR };