const ServiceRequest = require("../../models/ServiceRequest");

/**
 * Existing BILL request (KEEP THIS)
 */
exports.requestBill = async (req, res) => {
  try {
    const { restaurantId, tableId, tableCode } = req.body || {};

    if (!restaurantId || !tableId || !tableCode) {
      return res
        .status(400)
        .json({ message: "restaurantId, tableId, tableCode are required" });
    }

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

    const created = await ServiceRequest.create({
      restaurantId,
      tableId,
      tableCode,
      type: "BILL",
      status: "OPEN",
      requestedByCustomerId: req?.customer?._id || null,
    });

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
    console.error("requestBill error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ NEW: Generic service request (BILL / WAITER)
 */
exports.createServiceRequest = async (req, res) => {
  try {
    const { restaurantId, tableId, tableCode, type } = req.body || {};

    if (!restaurantId || !tableId || !tableCode || !type) {
      return res.status(400).json({
        message: "restaurantId, tableId, tableCode, type are required",
      });
    }

    if (!["BILL", "WAITER"].includes(type)) {
      return res.status(400).json({ message: "Invalid request type" });
    }

    const existing = await ServiceRequest.findOne({
      restaurantId,
      tableId,
      type,
      status: "OPEN",
    }).sort({ createdAt: -1 });

    if (existing) {
      return res.status(200).json({
        message: `${type} request already pending`,
        request: existing,
      });
    }

    const created = await ServiceRequest.create({
      restaurantId,
      tableId,
      tableCode,
      type,
      status: "OPEN",
      requestedByCustomerId: req?.customer?._id || null,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit("service_request", {
        request: created,
      });
    }
    console.log(
      "[SOCKET EMIT] service_request → restaurant_",
      restaurantId,
      "type:",
      created.type
    );

    return res.status(201).json({
      message: `${type} requested`,
      request: created,
    });
  } catch (err) {
    console.error("createServiceRequest error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
