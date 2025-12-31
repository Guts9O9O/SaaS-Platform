const Table = require("../../models/Table");

/* ---------------- CREATE TABLE ---------------- */
exports.createTable = async (req, res) => {
  try {
    const { role, restaurantId } = req.admin;

    if (role !== "RESTAURANT_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { tableCode } = req.body;
    if (!tableCode) {
      return res.status(400).json({ message: "tableCode required" });
    }

    const table = await Table.create({
      restaurantId,
      tableCode: tableCode.trim().toUpperCase(),
      isActive: true,
    });

    return res.status(201).json(table);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Table already exists" });
    }
    console.error("Create table error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- GET TABLES ---------------- */
exports.getTables = async (req, res) => {
  try {
    const { role, restaurantId } = req.admin;

    if (role !== "RESTAURANT_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const tables = await Table.find({ restaurantId }).sort({
      createdAt: -1,
    });

    return res.json(tables);
  } catch (err) {
    console.error("Get tables error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- ACTIVATE / DEACTIVATE ---------------- */
exports.updateTableStatus = async (req, res) => {
  try {
    const { role, restaurantId } = req.admin;
    const { isActive } = req.body;

    if (role !== "RESTAURANT_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const table = await Table.findOneAndUpdate(
      { _id: req.params.id, restaurantId },
      { isActive },
      { new: true }
    );

    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    return res.json(table);
  } catch (err) {
    console.error("Update table status error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.deleteTable = async (req, res) => {
  try {
    const { role, restaurantId } = req.admin;

    if (role !== "RESTAURANT_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const table = await Table.findOneAndDelete({
      _id: req.params.id,
      restaurantId,
    });

    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    return res.json({ message: "Table deleted" });
  } catch (err) {
    console.error("Delete table error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
