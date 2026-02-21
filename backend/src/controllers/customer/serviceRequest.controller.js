const ServiceRequest = require("../../models/ServiceRequest");
const Table = require("../../models/Table");

/**
 * Helper: look up assigned waiter for a table and emit waiter:called
 * to both the restaurant room and the waiter's personal room.
 *
 * Having this in one place ensures requestBill and createServiceRequest
 * both emit identical, complete payloads.
 */
async function emitWaiterCalled(io, { created, restaurantId, tableId, tableCode }) {
  const table = await Table.findOne({ _id: tableId, restaurantId }).select(
    "assignedWaiterId tableCode"
  );
  const waiterUserId = table?.assignedWaiterId?.toString() || null;

  // Build a complete payload so the waiter dashboard has everything it needs
  // (waiterUserId is included so the dashboard can emit waiter:accepted back
  // to the correct personal room).
  const payload = {
    requestId: created._id.toString(),
    restaurantId,
    tableId,
    tableCode,
    type: created.type,
    createdAt: created.createdAt,
    // ✅ FIX: include waiterUserId in the payload so the dashboard can use it
    // when emitting waiter:accepted. Previously this was missing, which meant
    // the accept event could never be routed back to the right waiter room.
    waiterUserId,
  };

  // Notify the whole restaurant room (admin dashboards, etc.)
  io.to(`restaurant_${restaurantId}`).emit("service_request", { request: created });
  io.to(`restaurant_${restaurantId}`).emit("waiter:called", payload);

  // Notify the assigned waiter's personal room directly
  if (waiterUserId) {
    io.to(`waiter_${waiterUserId}`).emit("service_request", { request: created });
    io.to(`waiter_${waiterUserId}`).emit("waiter:called", payload);
  } else {
    console.warn(
      `[WAITER CALL] Table ${tableCode} has no assignedWaiterId — ` +
      `only restaurant room was notified.`
    );
  }

  console.log(
    `[SOCKET EMIT] waiter:called → restaurant_${restaurantId}` +
    (waiterUserId ? ` + waiter_${waiterUserId}` : " (no assigned waiter)")
  );
}

/**
 * POST /api/customer/requests/bill
 * Dedicated bill request endpoint (kept for backwards compatibility).
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
      // ✅ FIX: requestBill had a dead `if (created.type === "WAITER")` branch
      // that could never be true since type is always "BILL" here. Removed it.
      // BILL requests only notify the restaurant room.
      io.to(`restaurant_${restaurantId}`).emit("service_request", {
        request: created,
      });
      console.log(`[SOCKET EMIT] service_request (BILL) → restaurant_${restaurantId}`);
    }

    return res.status(201).json({ message: "Bill requested", request: created });
  } catch (err) {
    console.error("requestBill error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/customer/requests
 * Generic service request handler (BILL or WAITER).
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
      if (created.type === "WAITER") {
        // ✅ Use shared helper — emits to restaurant room + waiter personal room
        // with a complete payload including waiterUserId
        await emitWaiterCalled(io, { created, restaurantId, tableId, tableCode });
      } else {
        // BILL: notify restaurant room only
        io.to(`restaurant_${restaurantId}`).emit("service_request", {
          request: created,
        });
        console.log(`[SOCKET EMIT] service_request (BILL) → restaurant_${restaurantId}`);
      }
    }

    return res.status(201).json({ message: `${type} requested`, request: created });
  } catch (err) {
    console.error("createServiceRequest error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};