let io = null;

module.exports = {
  init: (serverIo) => {
    io = serverIo;
  },

  getIO: () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
  },

  emitOrderCreated: (restaurantId, order) => {
    if (!io) return;
    io.to(`restaurant_${restaurantId}`).emit("order:created", order);
  },

  emitOrderUpdated: (restaurantId, order) => {
    if (!io) return;
    io.to(`restaurant_${restaurantId}`).emit("order:updated", order);
    const tableCode = (order.tableId && order.tableId.tableCode) || order.tableCode;
    if (tableCode) {
      io.to(`table_${restaurantId}_${tableCode}`).emit("order:status", order);
    }
  },

  /**
   * Emit waiter:called to all relevant rooms.
   * Deduplication is intentionally removed from the server side — the client
   * (waiter dashboard) handles it via functional state updates. Server-side
   * dedup was silently dropping legitimate re-calls within the 60s window.
   *
   * @param {object} opts
   * @param {string} opts.restaurantId
   * @param {string} opts.tableCode
   * @param {string} [opts.waiterUserId]  – assigned waiter's user _id (optional)
   * @param {object} opts.payload         – forwarded as-is to clients
   */
  emitWaiterCalled: ({ restaurantId, tableCode, waiterUserId, payload }) => {
    if (!io) return;

    // Always broadcast to the whole restaurant room (admin dashboards, etc.)
    io.to(`restaurant_${restaurantId}`).emit("waiter:called", payload);

    // Emit directly to the assigned waiter's personal room (most reliable path)
    if (waiterUserId) {
      io.to(`waiter_${waiterUserId}`).emit("waiter:called", payload);
    }

    // Also emit to the table room so the customer's own tab can react if needed
    if (tableCode) {
      io.to(`table_${restaurantId}_${tableCode}`).emit("waiter:called", payload);
    }
  },

  /**
   * Emit waiter:accepted to all relevant rooms so the customer's tab can
   * update its UI and the restaurant room is informed.
   */
  emitWaiterAccepted: ({ restaurantId, tableCode, waiterUserId, payload }) => {
    if (!io) return;

    io.to(`restaurant_${restaurantId}`).emit("waiter:accepted", payload);

    if (waiterUserId) {
      io.to(`waiter_${waiterUserId}`).emit("waiter:accepted", payload);
    }

    if (tableCode) {
      io.to(`table_${restaurantId}_${tableCode}`).emit("waiter:accepted", payload);
    }
  },
};