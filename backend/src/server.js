const jwt = require("jsonwebtoken");
const User = require("./models/User");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
connectDB();

app.use(cors({
  origin: process.env.FRONTEND_BASE_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

// ─── PUBLIC / CUSTOMER ROUTES ───────────────────────────────────────────────
app.use("/api/otp",           require("./routes/otpRoutes"));
app.use("/api/menu",          require("./routes/customer/menuPublic.routes"));
app.use("/api/menu-context",  require("./routes/customer/menuContext.routes"));
app.use("/api/menu",          require("./routes/menuRoutes"));

app.use("/api/customer/auth",     require("./routes/customer/auth.routes"));
// ✅ FIX: session route now responds to POST /api/customer/session directly
app.use("/api/customer/session",  require("./routes/customer/session.routes"));
app.use("/api/customer/orders",   require("./routes/customer/order.routes"));
app.use("/api/customer/requests", require("./routes/customer/serviceRequest.routes"));

// ─── ADMIN ROUTES ───────────────────────────────────────────────────────────
app.use("/api/admin/auth",        require("./routes/admin/auth.routes"));
app.use("/api/admin/menu",        require("./routes/admin/menu.routes"));
app.use("/api/admin/tables",      require("./routes/admin/table.routes"));
app.use("/api/admin/orders",      require("./routes/admin/order.routes"));
app.use("/api/admin/billing",     require("./routes/admin/billing.routes"));
app.use("/api/admin/revenue",     require("./routes/admin/revenue.routes"));
app.use("/api/admin/upload",      require("./routes/admin/upload.routes"));
app.use("/api/admin/analytics",   require("./routes/admin/customerAnalytics.routes"));
app.use("/api/admin/staff",       require("./routes/admin/staff.routes"));
app.use("/api/admin/qr",          require("./routes/admin/qr.routes"));
app.use("/api/admin/requests",    require("./routes/admin/serviceRequest.routes"));
app.use("/api/admin/restaurants", require("./routes/admin/restaurant.routes"));

// ⚠️ LEGACY — keep temporarily for backward compatibility
app.use("/api/admin/menu-categories", require("./routes/admin/menuCategory.routes"));
app.use("/api/admin/menu-items",      require("./routes/admin/menuItem.routes"));

// ✅ FIX: Removed duplicate /api/admin/super-admin mount.
// superAdminAuth.routes handles login; superAdmin.routes handles everything else.
// Merged into one mount using superAdmin.routes (which includes all endpoints).
app.use("/api/admin/super-admin", require("./routes/admin/superAdminAuth.routes"));
app.use("/api/admin/super-admin", require("./routes/admin/superAdmin.routes"));

// ✅ NEW: /api/admin/me — used by AdminLayout to verify token on every page load
// Returns the logged-in admin user. Reuses authAdmin middleware.
const authAdmin = require("./middleware/authAdmin");
app.get("/api/admin/me", authAdmin, (req, res) => {
  return res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      restaurantId: req.user.restaurantId,
    },
  });
});

// ─── WAITER ROUTES ──────────────────────────────────────────────────────────
app.use("/api/waiter/auth",   require("./routes/waiter/auth.routes"));
app.use("/api/waiter/tables", require("./routes/waiter/table.routes"));

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("QR Menu Backend is running"));

// ─── HTTP + SOCKET SERVER ───────────────────────────────────────────────────
const server = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_BASE_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join_order_room", ({ orderId }) => {
    socket.join(`order_${orderId}`);
  });

  socket.on("join_admin_room", ({ restaurantId }) => {
    if (restaurantId) {
      socket.join(`restaurant_${restaurantId}`);
      console.log(`Socket ${socket.id} joined restaurant_${restaurantId}`);
    }
  });

  socket.on("join_admin_room_secure", async ({ token }) => {
    try {
      if (!token) return;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.userId) return;
      const user = await User.findById(decoded.userId).select("_id role restaurantId");
      if (!user) return;
      if (!["SUPER_ADMIN", "RESTAURANT_ADMIN"].includes(user.role)) return;
      if (user.role === "RESTAURANT_ADMIN" && !user.restaurantId) return;
      const room = `restaurant_${user.restaurantId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined ${room} (secure admin)`);
    } catch (e) {
      console.log("join_admin_room_secure error:", e.message);
    }
  });

  socket.on("join_waiter_room", async ({ token }) => {
    try {
      if (!token) return;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.userId) return;
      const user = await User.findById(decoded.userId).select("_id role restaurantId");
      if (!user) return;
      if (user.role !== "STAFF") return;
      const room = `waiter_${user._id}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined ${room} (waiter)`);
    } catch (e) {
      console.log("join_waiter_room error:", e.message);
    }
  });

  socket.on("leave_admin_room", ({ restaurantId }) => {
    if (restaurantId) {
      socket.leave(`restaurant_${restaurantId}`);
      console.log(`Socket ${socket.id} left restaurant_${restaurantId}`);
    }
  });

  socket.on("join_customer_session", ({ sessionId }) => {
    if (sessionId) {
      socket.join(`session_${sessionId}`);
      console.log(`Socket ${socket.id} joined session_${sessionId}`);
    }
  });

  socket.on("leave_customer_session", ({ sessionId }) => {
    if (sessionId) {
      socket.leave(`session_${sessionId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});