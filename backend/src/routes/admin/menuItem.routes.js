const express = require("express");
const router = express.Router();
const authAdmin = require("../../middleware/authAdmin");
const upload = require("../../middleware/fileUpload");
const controller = require("../../controllers/admin/menuItem.controller");

router.use(authAdmin);

router.post("/", controller.createItem);
router.get("/", controller.getItems);
router.patch("/:id", controller.updateItem);
router.delete("/:id", controller.deleteItem);

// ✅ FIX: Video upload route — was completely missing
// upload.array("videos", 10) puts files in req.files
// matches the controller's const { files } = req
router.post("/:itemId/videos", upload.array("videos", 10), controller.uploadMenuItemVideo);

module.exports = router;