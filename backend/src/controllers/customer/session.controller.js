const CustomerSession = require("../../models/CustomerSession");
const Restaurant = require("../../models/Restaurant");
const Table = require("../../models/Table");
const crypto = require("crypto");

function generateSessionId() {
  return crypto.randomBytes(16).toString("hex");
}

// ✅ NEW: Check if existing session cookie is still valid
// Called on every page reload BEFORE creating a new session
// Returns same shape as createSession so frontend context works identically
exports.checkSession = async (req, res) => {
  try {
    const token = req.cookies?.customerSessionId;
    if (!token) return res.status(401).json({ message: "No session" });

    const session = await CustomerSession.findOne({
      sessionId: token,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) return res.status(401).json({ message: "Session expired" });

    // Fetch restaurant and table separately (no populate to keep it simple)
    const restaurant = await Restaurant.findById(session.restaurantId).select("_id name slug");
    const table = await Table.findById(session.tableId).select("_id tableCode");

    if (!restaurant || !table) {
      return res.status(401).json({ message: "Session data missing" });
    }

    // ✅ Return exact same shape as createSession
    return res.json({
      sessionId: session.sessionId,
      restaurant: {
        id: restaurant._id,
        _id: restaurant._id,
        name: restaurant.name,
        slug: restaurant.slug,
      },
      table: {
        id: table._id,
        _id: table._id,
        tableCode: table.tableCode,
      },
    });
  } catch (err) {
    console.error("checkSession error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

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

    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours

    const session = await CustomerSession.create({
      restaurantId: restaurant._id,
      tableId: table._id,
      sessionId: generateSessionId(),
      expiresAt,
    });

    res.cookie("customerSessionId", session.sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // set true in production behind HTTPS
      maxAge: 6 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      sessionId: session.sessionId,
      restaurant: {
        id: restaurant._id,
        _id: restaurant._id,
        name: restaurant.name,
        slug: restaurant.slug,
      },
      table: {
        id: table._id,
        _id: table._id,
        tableCode: table.tableCode,
      },
    });
  } catch (err) {
    console.error("Create session error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};