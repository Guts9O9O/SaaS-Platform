const Restaurant = require("../../models/Restaurant");
const Table = require("../../models/Table");
const MenuCategory = require("../../models/MenuCategory");
const MenuItem = require("../../models/MenuItem");

exports.getMenuContext = async (req, res) => {
  try {
    const { restaurantSlug, tableCode } = req.query;

    if (!restaurantSlug || !tableCode) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    const restaurant = await Restaurant.findOne({
      slug: restaurantSlug,
      isActive: true,
    });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const table = await Table.findOne({
      restaurantId: restaurant._id,
      tableCode,
      isActive: true,
    });

    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    // ✅ FETCH MENU
    const categories = await MenuCategory.find({
      restaurantId: restaurant._id,
      isActive: true,
    })
      .sort({ order: 1 })
      .lean();

    const items = await MenuItem.find({
      restaurantId: restaurant._id,
      isActive: true,
    }).lean();

    const menu = categories.map((category) => ({
      id: category._id,
      name: category.name,
      description: category.description || "",
      items: items
        .filter(
          (item) =>
            item.categoryId?.toString() === category._id.toString()
        )
        .map((item) => ({
          id: item._id,
          name: item.name,
          description: item.description || "",
          price: item.price,
          images: item.images || [],
          variants: item.variants || [],
        })),
    }));

    return res.json({
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        slug: restaurant.slug,
      },
      table: {
        id: table._id,
        tableCode: table.tableCode,
      },
      categories: menu, // ✅ THIS FIXES YOUR UI
    });
  } catch (err) {
    console.error("Menu context error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
