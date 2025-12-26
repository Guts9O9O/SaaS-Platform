const MenuCategory = require("../../models/MenuCategory");

/* ---------------- CREATE CATEGORY ---------------- */
exports.createCategory = async (req, res) => {
  try {
    const { restaurantId } = req.admin;
    const { name, description, order } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name required" });
    }

    const category = await MenuCategory.create({
      restaurantId,
      name: name.trim(),
      description,
      order,
      isActive: true,
    });

    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Category already exists" });
    }
    console.error("Create category error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- GET CATEGORIES ---------------- */
exports.getCategories = async (req, res) => {
  try {
    const { restaurantId } = req.admin;

    const categories = await MenuCategory.find({ restaurantId })
      .sort({ order: 1, createdAt: 1 });

    res.json(categories);
  } catch (err) {
    console.error("Get categories error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- UPDATE CATEGORY ---------------- */
exports.updateCategory = async (req, res) => {
  try {
    const { restaurantId } = req.admin;
    const { name, description, order, isActive } = req.body;

    const updates = {};

    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (order !== undefined) updates.order = order;
    if (typeof isActive === "boolean") updates.isActive = isActive;

    const category = await MenuCategory.findOneAndUpdate(
      { _id: req.params.id, restaurantId },
      updates,
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
  } catch (err) {
    console.error("Update category error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- DELETE CATEGORY ---------------- */
exports.deleteCategory = async (req, res) => {
  try {
    const { restaurantId } = req.admin;

    const deleted = await MenuCategory.findOneAndDelete({
      _id: req.params.id,
      restaurantId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete category error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
