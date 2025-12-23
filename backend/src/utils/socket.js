// backend/src/utils/socket.js
let io = null;

module.exports = {
  init: (serverIo) => {
    io = serverIo;
  },
  getIO: () => {
    if (!io) throw new Error('Socket.io not initialized!');
    return io;
  },
  // helper: emit new order to restaurant room
  emitOrderCreated: (restaurantId, order) => {
    if (!io) return;
    const room = `restaurant_${restaurantId}`;
    io.to(room).emit('order:created', order);
  },
  // helper: emit order update
  emitOrderUpdated: (restaurantId, order) => {
    if (!io) return;
    const room = `restaurant_${restaurantId}`;
    io.to(room).emit('order:updated', order);
    // also notify table room (if tableCode exists)
    const tableCode = (order.tableId && order.tableId.tableCode) || order.tableCode;
    if (tableCode) {
      const tableRoom = `table_${restaurantId}_${tableCode}`;
      io.to(tableRoom).emit('order:status', order);
    }
  }
};
