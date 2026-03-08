const ServiceRequest = require("../../models/ServiceRequest");
const Table = require("../../models/Table");

/**
 * Helper: look up assigned waiter for a table and emit waiter:called
 * to both the restaurant room and the waiter's personal room.
 */
async function emitWaiterCalled(io, { created, restaurantId, tableId, tableCode }) {
  const table = await Table.findOne({ _id: tableId, restaurantId }).select(
    "assignedWaiterId tableCode"
  );
  const waiterUserId = table?.assignedWaiterId?.toString() || null;
  const payload = {
    requestId: created._id.toString(),
    restaurantId,
    tableId,
    tableCode,
    type: created.type,
    createdAt: created.createdAt,
    waiterUserId,
  };
  io.to(`restaurant_${restaurantId}`).emit("service_request", { request: created });
  io.to(`restaurant_${restaurantId}`).emit("waiter:called", payload);
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
 * Helper: emit bill request to waiter room
 */
async function emitBillRequestToWaiter(io, { created, restaurantId, tableId, tableCode }) {
  const table = await Table.findOne({ _id: tableId, restaurantId }).select(
    "assignedWaiterId tableCode"
  );
  const waiterUserId = table?.assignedWaiterId?.toString() || null;
  const payload = {
    requestId: created._id.toString(),
    restaurantId,
    tableId,
    tableCode,
    type: "BILL",
    createdAt: created.createdAt,
    waiterUserId,
  };
  // Notify restaurant room (admin dashboard)
  io.to(`restaurant_${restaurantId}`).emit("service_request", { request: created });
  // ✅ NEW: Also notify the assigned waiter directly
  if (waiterUserId) {
    io.to(`waiter_${waiterUserId}`).emit("waiter:bill_requested", payload);
    console.log(`[SOCKET EMIT] waiter:bill_requested → waiter_${waiterUserId} (Table ${tableCode})`);
  } else {
    console.warn(`[BILL REQUEST] Table ${tableCode} has no assignedWaiterId — waiter not notified.`);
  }
}

/**
 * POST /api/customer/requests/bill
 */
exports.requestBill = async (req, res) => {
  try {
    const { restaurantId, tableId, tableCode } = req.body || {};
    if (!restaurantId || !tableId || !tableCode) {
      return res.status(400).json({ message: "restaurantId, tableId, tableCode are required" });
    }
    const existing = await ServiceRequest.findOne({
      restaurantId, tableId, type: "BILL", status: "OPEN",
    }).sort({ createdAt: -1 });
    if (existing) {
      const io = req.app.get("io");
      if (io) await emitBillRequestToWaiter(io, { created: existing, restaurantId, tableId, tableCode });
      return res.status(200).json({ message: "Bill request already pending", request: existing });
    }
    const created = await ServiceRequest.create({
      restaurantId, tableId, tableCode,
      type: "BILL", status: "OPEN",
      requestedByCustomerId: req?.customer?._id || null,
    });
    const io = req.app.get("io");
    if (io) {
      await emitBillRequestToWaiter(io, { created, restaurantId, tableId, tableCode });
    }
    return res.status(201).json({ message: "Bill requested", request: created });
  } catch (err) {
    console.error("requestBill error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/customer/requests
 */
exports.createServiceRequest = async (req, res) => {
  try {
    const { restaurantId, tableId, tableCode, type } = req.body || {};
    if (!restaurantId || !tableId || !tableCode || !type) {
      return res.status(400).json({ message: "restaurantId, tableId, tableCode, type are required" });
    }
    if (!["BILL", "WAITER"].includes(type)) {
      return res.status(400).json({ message: "Invalid request type" });
    }
    const existing = await ServiceRequest.findOne({
      restaurantId, tableId, type, status: "OPEN",
    }).sort({ createdAt: -1 });
    if (existing) {
      // Re-emit even for duplicates so waiter always gets notified
      const io = req.app.get("io");
      if (io) {
        if (type === "WAITER") {
          await emitWaiterCalled(io, { created: existing, restaurantId, tableId, tableCode });
        } else {
          await emitBillRequestToWaiter(io, { created: existing, restaurantId, tableId, tableCode });
        }
      }
      return res.status(200).json({ message: `${type} request already pending`, request: existing });
    }
    const created = await ServiceRequest.create({
      restaurantId, tableId, tableCode, type, status: "OPEN",
      requestedByCustomerId: req?.customer?._id || null,
    });
    const io = req.app.get("io");
    if (io) {
      if (created.type === "WAITER") {
        await emitWaiterCalled(io, { created, restaurantId, tableId, tableCode });
      } else {
        // BILL: notify restaurant room + waiter
        await emitBillRequestToWaiter(io, { created, restaurantId, tableId, tableCode });
      }
    }
    return res.status(201).json({ message: `${type} requested`, request: created });
  } catch (err) {
    console.error("createServiceRequest error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};