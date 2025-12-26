const Restaurant = require("../../models/Restaurant");
const MenuCategory = require("../../models/MenuCategory");
const MenuItem = require("../../models/MenuItem");

const getPublicMenuBySlug = async (req, res) => {
  try {
    const { restaurantSlug } = req.params;

    const restaurant = await Restaurant.findOne({
      slug: restaurantSlug,
      isActive: true,
    });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const categories = await MenuCategory.find({
      restaurantId: restaurant._id,
      isActive: true,
    })
      .sort({ order: 1 })
      .lean();

    const items = await MenuItem.find({
      restaurantId: restaurant._id,
      isAvailable: true,
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
      categories: menu,
    });
  } catch (err) {
    console.error("[PUBLIC MENU ERROR]", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getPublicMenuBySlug,
};
