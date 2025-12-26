const Restaurant = require("../../models/Restaurant");
const Table = require("../../models/Table");

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
    });
  } catch (err) {
    console.error("Menu context error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
