const express = require("express");
const upload = require("../../utils/upload");
const authAdmin = require("../../middleware/authAdmin");
const router = express.Router();

router.post(
  "/menu-image",
  authAdmin,
  upload.single("image"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const imageUrl = `/uploads/menu/${req.file.filename}`;
    res.json({ imageUrl });
  }
);

module.exports = router;
