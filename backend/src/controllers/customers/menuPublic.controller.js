import Restaurant from "../../models/Restaurant.js";
import MenuCategory from "../../models/MenuCategory.js";
import MenuItem from "../../models/MenuItem.js";

export const getPublicMenuBySlug = async (req, res) => {
  try {
    const { restaurantSlug } = req.params;

    // 1. Validate restaurant
    const restaurant = await Restaurant.findOne({
      slug: restaurantSlug,
      isActive: true,
    });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // 2. Fetch active categories
    const categories = await MenuCategory.find({
      restaurant: restaurant._id,
      isActive: true,
    })
      .sort({ order: 1 })
      .lean();

    // 3. Fetch active items
    const items = await MenuItem.find({
      restaurant: restaurant._id,
      isActive: true,
    }).lean();

    // 4. Group items by category
    const menu = categories.map((category) => ({
      id: category._id,
      name: category.name,
      description: category.description || "",
      items: items
        .filter(
          (item) =>
            item.category?.toString() === category._id.toString()
        )
        .map((item) => ({
          id: item._id,
          name: item.name,
          description: item.description || "",
          price: item.price,
          image: item.image || null,
          isVeg: item.isVeg,
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
