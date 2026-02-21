const Table = require("../../models/Table");
const User = require("../../models/User");

exports.assignWaiterToTable = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { tableId } = req.params;
    const { waiterId } = req.body || {}; // null to unassign

    const table = await Table.findOne({ _id: tableId, restaurantId });
    if (!table) return res.status(404).json({ message: "Table not found" });

    if (waiterId) {
      const waiter = await User.findOne({ _id: waiterId, restaurantId, role: "STAFF" }).select("_id");
      if (!waiter) return res.status(400).json({ message: "Invalid waiter" });
      table.assignedWaiterId = waiter._id;
    } else {
      table.assignedWaiterId = null;
    }

    await table.save();

    return res.json({
      message: "Waiter assignment updated",
      table: {
        _id: table._id,
        tableCode: table.tableCode,
        assignedWaiterId: table.assignedWaiterId,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
};
