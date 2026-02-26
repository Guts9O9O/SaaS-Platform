const MenuItem = require("../../models/MenuItem");
const Restaurant = require("../../models/Restaurant");

/* ---------------- CREATE ITEM ---------------- */
exports.createItem = async (req, res) => {
  try {
    const { restaurantId } = req.admin;
    const { categoryId, name, description, price, variants, addons, images, isVeg = true } = req.body;
    if (!categoryId || !name || price === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const item = await MenuItem.create({
      restaurantId, categoryId, name: name.trim(),
      description, price, variants, addons,
      images: images || [], isActive: true, isVeg: Boolean(isVeg),
    });
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "Item already exists" });
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
    const { name, description, price, variants, addons, images, isActive, isVeg } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (variants !== undefined) updates.variants = variants;
    if (addons !== undefined) updates.addons = addons;
    if (images !== undefined) updates.images = images;
    if (typeof isActive === "boolean") updates.isActive = isActive;
    if (typeof isVeg === "boolean") updates.isVeg = isVeg;
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, restaurantId }, updates, { new: true }
    );
    if (!item) return res.status(404).json({ message: "Item not found" });
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
    const deleted = await MenuItem.findOneAndDelete({ _id: req.params.id, restaurantId });
    if (!deleted) return res.status(404).json({ message: "Item not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete item error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- UPLOAD VIDEO ---------------- */
exports.uploadMenuItemVideo = async (req, res) => {
  try {
    const { itemId } = req.params;

    // ✅ FIX: req.files set by multer.array() — was destructured incorrectly
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const menuItem = await MenuItem.findById(itemId);
    if (!menuItem) return res.status(404).json({ message: "Menu item not found" });

    const restaurant = await Restaurant.findById(menuItem.restaurantId).select("menuItemVideoLimit");
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const limit = restaurant.menuItemVideoLimit ?? 1;
    const currentCount = menuItem.videos?.length ?? 0;

    if (currentCount >= limit) {
      return res.status(403).json({
        message: `Video limit reached. This item already has ${currentCount}/${limit} video(s).`,
      });
    }

    const slotsLeft = limit - currentCount;
    if (files.length > slotsLeft) {
      return res.status(403).json({
        message: `You can only upload ${slotsLeft} more video(s). Currently ${currentCount}/${limit} used.`,
      });
    }

    // ✅ FIX: Convert filesystem path → URL-friendly path
    // file.path on Windows uses backslashes e.g. uploads\menu-videos\file.mp4
    // We normalize to forward slashes and store as /uploads/menu-videos/file.mp4
    const uploadedPaths = files.map((file) => {
      const normalized = file.path.replace(/\\/g, "/");
      const idx = normalized.indexOf("uploads/");
      return idx !== -1 ? "/" + normalized.slice(idx) : "/" + normalized;
    });

    if (!Array.isArray(menuItem.videos)) menuItem.videos = [];
    menuItem.videos.push(...uploadedPaths);
    await menuItem.save();

    res.status(200).json({
      message: "Video(s) uploaded successfully",
      videos: menuItem.videos,
      usage: `${menuItem.videos.length}/${limit} videos used`,
    });
  } catch (err) {
    console.error("Upload video error:", err);
    res.status(500).json({ message: "Server error" });
  }
};