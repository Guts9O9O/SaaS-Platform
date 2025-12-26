const express = require("express");
const router = express.Router();
const authAdmin = require("../../middleware/authAdmin");
const controller = require("../../controllers/admin/menuItem.controller");

// Protect all menu item routes
router.use(authAdmin);

// Create menu item
router.post("/", controller.createItem);

// Get menu items (optionally by category)
router.get("/", controller.getItems);

// Update menu item
router.patch("/:id", controller.updateItem);

// Delete menu item
router.delete("/:id", controller.deleteItem);

module.exports = router;
