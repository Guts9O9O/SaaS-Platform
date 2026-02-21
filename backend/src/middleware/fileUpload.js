// backend/src/middleware/fileUpload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const VIDEO_DIR = path.join(process.cwd(), "uploads", "menu-videos");
fs.mkdirSync(VIDEO_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VIDEO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext || ".mp4";
    cb(null, `menuvideo_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime", // .mov
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  return cb(new Error("Only video files are allowed (mp4/webm/ogg/mov)"), false);
};

module.exports = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter,
});
