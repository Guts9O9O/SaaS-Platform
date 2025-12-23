const Table = require("../models/Table");
const Restaurant = require("../models/Restaurant");
const { generateQrDataUrl } = require("../utils/qrGenerator");

/**
 * GET QR for a table (Restaurant Admin only)
 */
exports.getTableQr = async (req, res) => {
  try {
    const { role, restaurantId } = req.admin;
    const { tableId } = req.params;

    if (role !== "RESTAURANT_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const table = await Table.findOne({ _id: tableId, restaurantId });
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const customerUrl = `${process.env.FRONTEND_BASE_URL}/r/${restaurant.slug}/t/${table.tableCode}`;

    const qrDataUrl = await generateQrDataUrl(customerUrl);

    res.json({
      tableId,
      tableCode: table.tableCode,
      qrUrl: customerUrl,
      qrDataUrl,
    });
  } catch (err) {
    console.error("QR generation error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
