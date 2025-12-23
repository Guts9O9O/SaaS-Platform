// backend/src/server.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

connectDB();

app.use(cors({
  origin: process.env.FRONTEND_BASE_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// routes (existing)
app.use('/api/otp', require('./routes/otpRoutes'));
app.use("/api/menu", require("./routes/menuRoutes"));  
app.use("/api/menu-context", require("./routes/menuContextRoutes"));
app.use("/api/menu", require("./routes/customers/menuPublic.routes"));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/admin', require('./routes/adminAuth'));
app.use('/api/admin/menu', require('./routes/adminMenuRoutes'));
app.use('/api/admin/tables', require('./routes/adminTableRoutes'));
app.use('/api/admin/orders', require('./routes/adminOrderRoutes'));
app.use("/api/admin/restaurants", require("./routes/adminRestaurantRoutes"));
app.use("/api/admin", require("./routes/adminQrRoutes"));


// simple health
app.get('/', (req, res) => res.send('QR Menu Backend is running (with sockets)'));

// start server and socket.io
const server = require('http').createServer(app);
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_BASE_URL || 'http://localhost:3000',
    methods: ['GET','POST'],
    credentials: true
  }
});

// attach io to app so routes can use it
app.set('io', io);

// basic socket namespaces/rooms idea
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join_order_room', ({ orderId }) => {
    socket.join(`order_${orderId}`);
  });


  // join a room for admin of a restaurant
  // client should emit: socket.emit('join_admin_room', { restaurantId: '<id>' })
  socket.on('join_admin_room', ({ restaurantId }) => {
    if (restaurantId) {
      const room = `restaurant_${restaurantId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined ${room}`);
    }
  });

  // customer joins their order room
  socket.on('join_order_room', ({ orderId }) => {
    if (!orderId) return;
    const room = `order_${orderId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined ${room}`);
  });

  socket.on('leave_admin_room', ({ restaurantId }) => {
    if (restaurantId) {
      const room = `restaurant_${restaurantId}`;
      socket.leave(room);
      console.log(`Socket ${socket.id} left ${room}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
