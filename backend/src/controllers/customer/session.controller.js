const CustomerSession = require("../../models/CustomerSession");
const Restaurant = require("../../models/Restaurant");
const Table = require("../../models/Table");
const crypto = require("crypto");

function generateSessionId() {
  // opaque token: 32 chars hex
  return crypto.randomBytes(16).toString("hex");
}

exports.createSession = async (req, res) => {
  try {
    const { restaurantSlug, tableCode } = req.body;

    if (!restaurantSlug || !tableCode) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    const restaurant = await Restaurant.findOne({ slug: restaurantSlug, isActive: true });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const table = await Table.findOne({
      restaurantId: restaurant._id,
      tableCode: tableCode.trim().toUpperCase(),
      isActive: true,
    });
    if (!table) return res.status(404).json({ message: "Table not found" });

    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);

    const session = await CustomerSession.create({
      restaurantId: restaurant._id,
      tableId: table._id,
      sessionId: generateSessionId(),
      expiresAt,
    });

    // ✅ cookie should store opaque sessionId, not Mongo _id
    res.cookie("customerSessionId", session.sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // prod: true behind https
      maxAge: 6 * 60 * 60 * 1000,
    });

    res.status(201).json({
      sessionId: session.sessionId,
      restaurant: { id: restaurant._id, _id: restaurant._id, name: restaurant.name, slug: restaurant.slug },
      table: { id: table._id, _id: table._id, tableCode: table.tableCode },
    });
  } catch (err) {
    console.error("Create session error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
