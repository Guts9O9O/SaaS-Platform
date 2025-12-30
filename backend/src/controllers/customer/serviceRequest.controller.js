const ServiceRequest = require("../../models/ServiceRequest");

exports.requestBill = async (req, res) => {
  try {
    const { restaurantId, tableId, tableCode } = req.body || {};

    if (!restaurantId || !tableId || !tableCode) {
      return res.status(400).json({ message: "restaurantId, tableId, tableCode are required" });
    }

    // If already OPEN, return same request (prevents spam)
    const existing = await ServiceRequest.findOne({
      restaurantId,
      tableId,
      type: "BILL",
      status: "OPEN",
    }).sort({ createdAt: -1 });

    if (existing) {
      return res.status(200).json({
        message: "Bill request already pending",
        request: existing,
      });
    }

    // Create request
    const requestedByCustomerId = req?.customer?._id || null;

    const created = await ServiceRequest.create({
      restaurantId,
      tableId,
      tableCode,
      type: "BILL",
      status: "OPEN",
      requestedByCustomerId,
    });

    // Notify admin via socket room you already use: restaurant_<restaurantId>
    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit("service_request", {
        request: created,
      });
    }

    return res.status(201).json({
      message: "Bill requested",
      request: created,
    });
  } catch (err) {
    // If unique partial index hits (rare), return pending instead of crashing
    if (String(err?.code) === "11000") {
      const { restaurantId, tableId } = req.body || {};
      const existing = await ServiceRequest.findOne({
        restaurantId,
        tableId,
        type: "BILL",
        status: "OPEN",
      }).sort({ createdAt: -1 });

      return res.status(200).json({
        message: "Bill request already pending",
        request: existing,
      });
    }

    console.error("requestBill error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
