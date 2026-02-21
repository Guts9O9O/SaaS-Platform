const Table = require("../../models/Table");

exports.myTables = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const waiterId = req.user._id;

    const tables = await Table.find({
      restaurantId,
      assignedWaiterId: waiterId,
      isActive: true,
    })
      .select("_id tableCode isActive assignedWaiterId")
      .sort({ tableCode: 1 });

    return res.json({ tables });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
};
