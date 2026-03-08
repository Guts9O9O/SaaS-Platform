const Restaurant = require("../../models/Restaurant");
const MenuCategory = require("../../models/MenuCategory");
const MenuItem = require("../../models/MenuItem");
const Table = require("../../models/Table");

exports.getMenuContext = async (req, res) => {
  try {
    const { restaurantSlug, tableCode } = req.query;
    if (!restaurantSlug || !tableCode) {
      return res.status(400).json({ message: "restaurantSlug and tableCode are required" });
    }

    const restaurant = await Restaurant.findOne({ slug: restaurantSlug, isActive: true })
      .select("_id name slug logoUrl address currency")
      .lean();
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const table = await Table.findOne({ restaurantId: restaurant._id, tableCode, isActive: true })
      .select("_id tableCode isActive assignedWaiterId")
      .lean();
    if (!table) return res.status(404).json({ message: "Table not found" });

    const categories = await MenuCategory.find({ restaurantId: restaurant._id, isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const menuItems = await MenuItem.find({ restaurantId: restaurant._id, isActive: true }).lean();

    // Group items by categoryId
    const itemsByCategory = {};
    for (const item of menuItems) {
      const catKey = item.categoryId?.toString();
      if (!catKey) continue;
      if (!itemsByCategory[catKey]) itemsByCategory[catKey] = [];
      itemsByCategory[catKey].push({
        _id: item._id,
        name: item.name,
        description: item.description || "",
        price: item.price,
        images: item.images || [],
        videos: item.videos || [],
        isVeg: item.isVeg,
        isActive: item.isActive,
        prepTime: item.prepTime || "",   // ✅ pass prepTime to customer
        variants: item.variants || [],
        addons: item.addons || [],
      });
    }

    const categoriesWithItems = categories.map(cat => ({
      _id: cat._id,
      name: cat.name,
      isActive: cat.isActive,
      items: itemsByCategory[cat._id?.toString()] || [],
    }));

    return res.json({
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        slug: restaurant.slug,
        logoUrl: restaurant.logoUrl || "",
        address: restaurant.address || "",
        currency: restaurant.currency || "INR",
      },
      table: {
        _id: table._id,
        tableCode: table.tableCode,
        isActive: table.isActive,
      },
      categories: categoriesWithItems,
    });
  } catch (err) {
    console.error("getMenuContext error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};