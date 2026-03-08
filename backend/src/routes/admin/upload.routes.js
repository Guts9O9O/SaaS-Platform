const express = require("express");
const upload = require("../../utils/upload");
const videoUpload = require("../../middleware/fileUpload");
const authAdmin = require("../../middleware/authAdmin");
const authSuperAdmin = require("../../middleware/authSuperAdmin");
const Restaurant = require("../../models/Restaurant");
const MenuItem = require("../../models/MenuItem");
const fs = require("fs");
const router = express.Router();

// ── Middleware: allow either RESTAURANT_ADMIN or SUPER_ADMIN ─────────────────
function authAdminOrSuperAdmin(req, res, next) {
  // Try super admin token first
  authSuperAdmin(req, res, (superErr) => {
    if (!superErr && (req.admin || req.user)) return next();
    // Fall back to restaurant admin token
    authAdmin(req, res, (adminErr) => {
      if (!adminErr && (req.admin || req.user)) return next();
      return res.status(401).json({ message: "Unauthorized" });
    });
  });
}

function getActor(req) {
  return req.admin || req.user || null;
}
function resolveRestaurantId(req) {
  const actor = getActor(req);
  if (actor?.role === "SUPER_ADMIN") {
    return req.body.restaurantId || req.query.restaurantId || req.params.restaurantId || null;
  }
  return actor?.restaurantId || null;
}
async function getRestaurantVideoCount(restaurantId) {
  const agg = await MenuItem.aggregate([
    { $match: { restaurantId: MenuItem.db.base.Types.ObjectId(restaurantId) } },
    { $project: { videos: { $ifNull: ["$videos", []] } } },
    { $unwind: { path: "$videos", preserveNullAndEmptyArrays: false } },
    { $count: "count" },
  ]);
  return agg?.[0]?.count || 0;
}

// ── Menu image ───────────────────────────────────────────────────────────────
router.post("/menu-image", authAdmin, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const imageUrl = `/uploads/menu/${req.file.filename}`;
  res.json({ imageUrl });
});

// ── Restaurant logo ──────────────────────────────────────────────────────────
// POST /api/admin/upload/restaurant-logo
// FormData: logo (file), restaurantId (for SUPER_ADMIN)
// Uses authAdminOrSuperAdmin so both roles can upload
router.post("/restaurant-logo", authAdminOrSuperAdmin, upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const actor = getActor(req);
    if (!actor) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(403).json({ message: "Forbidden" });
    }

    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ message: "restaurantId is required" });
    }

    const logoUrl = `/uploads/menu/${req.file.filename}`;
    await Restaurant.findByIdAndUpdate(restaurantId, { logoUrl });

    return res.json({ logoUrl });
  } catch (err) {
    console.error("restaurant-logo upload error:", err);
    if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch {} }
    return res.status(500).json({ message: "Server error" });
  }
});

// ── Menu video ───────────────────────────────────────────────────────────────
router.post("/menu-video", authAdmin, videoUpload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const actor = getActor(req);
    if (!actor || !["SUPER_ADMIN", "RESTAURANT_ADMIN"].includes(actor.role)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(403).json({ message: "Forbidden" });
    }
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ message: "restaurantId is required" });
    }
    const restaurant = await Restaurant.findById(restaurantId).select("restaurantVideoLimit menuItemVideoLimit isActive").lean();
    if (!restaurant || restaurant.isActive === false) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(404).json({ message: "Restaurant not found/inactive" });
    }
    const totalVideos = await getRestaurantVideoCount(restaurantId);
    const restaurantLimit = Number(restaurant.restaurantVideoLimit ?? 0);
    if (restaurantLimit >= 0 && totalVideos >= restaurantLimit) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(403).json({ message: `Restaurant video limit reached (${restaurantLimit}). Contact Super Admin to increase limit.` });
    }
    const itemId = req.body.itemId || req.query.itemId;
    if (itemId) {
      const item = await MenuItem.findById(itemId).select("videos restaurantId").lean();
      if (!item) { try { fs.unlinkSync(req.file.path); } catch {} return res.status(404).json({ message: "Menu item not found" }); }
      if (String(item.restaurantId) !== String(restaurantId)) { try { fs.unlinkSync(req.file.path); } catch {} return res.status(403).json({ message: "Item does not belong to this restaurant" }); }
      const perItemLimit = Number(restaurant.menuItemVideoLimit ?? 0);
      const currentItemVideos = Array.isArray(item.videos) ? item.videos.length : 0;
      if (perItemLimit >= 0 && currentItemVideos >= perItemLimit) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(403).json({ message: `Menu item video limit reached (${perItemLimit}). Contact Super Admin to increase limit.` });
      }
    }
    const videoUrl = `/uploads/menu-videos/${req.file.filename}`;
    return res.json({ videoUrl });
  } catch (err) {
    console.error("menu-video upload error:", err);
    if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch {} }
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;