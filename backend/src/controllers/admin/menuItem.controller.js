const MenuItem = require("../../models/MenuItem");

/* ---------------- CREATE ITEM ---------------- */
exports.createItem = async (req, res) => {
  try {
    const { restaurantId } = req.admin;
    const {
      categoryId,
      name,
      description,
      price,
      variants,
      addons,
      images,
    } = req.body;

    if (!categoryId || !name || price === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const item = await MenuItem.create({
      restaurantId,
      categoryId,
      name: name.trim(),
      description,
      price,
      variants,
      addons,
      images: images || [],
      isActive: true,
    });

    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Item already exists" });
    }
    console.error("Create item error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- GET ITEMS ---------------- */
exports.getItems = async (req, res) => {
  try {
    const { restaurantId } = req.admin;
    const { categoryId } = req.query;

    const filter = { restaurantId };
    if (categoryId) filter.categoryId = categoryId;

    const items = await MenuItem.find(filter).sort({ createdAt: 1 });

    res.json(items);
  } catch (err) {
    console.error("Get items error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- UPDATE ITEM ---------------- */
exports.updateItem = async (req, res) => {
  try {
    const { restaurantId } = req.admin;
    const {
      name,
      description,
      price,
      variants,
      addons,
      images,
      isActive,
    } = req.body;

    const updates = {};

    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (variants !== undefined) updates.variants = variants;
    if (addons !== undefined) updates.addons = addons;
    if (images !== undefined) updates.images = images;
    if (typeof isActive === "boolean") updates.isActive = isActive;

    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, restaurantId },
      updates,
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(item);
  } catch (err) {
    console.error("Update item error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- DELETE ITEM ---------------- */
exports.deleteItem = async (req, res) => {
  try {
    const { restaurantId } = req.admin;

    const deleted = await MenuItem.findOneAndDelete({
      _id: req.params.id,
      restaurantId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete item error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
