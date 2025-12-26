const express = require("express");
const router = express.Router();
const authAdmin = require("../../middleware/authAdmin");
const controller = require("../../controllers/admin/menuCategory.controller");

router.use(authAdmin);

router.post("/", controller.createCategory);
router.get("/", controller.getCategories);
router.patch("/:id", controller.updateCategory);
router.delete("/:id", controller.deleteCategory);

module.exports = router;
