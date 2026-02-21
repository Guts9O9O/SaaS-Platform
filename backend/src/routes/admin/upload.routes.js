const express = require("express");
const upload = require("../../utils/upload");
const videoUpload = require("../../middleware/fileUpload");
const authAdmin = require("../../middleware/authAdmin");
const Restaurant = require("../../models/Restaurant");
const MenuItem = require("../../models/MenuItem");
const fs = require("fs");

const router = express.Router();

function getActor(req) {
  // your codebase sometimes uses req.user, sometimes req.admin
  return req.admin || req.user || null;
}

function resolveRestaurantId(req) {
  const actor = getActor(req);

  // SUPER_ADMIN may pass restaurantId
  if (actor?.role === "SUPER_ADMIN") {
    return (
      req.body.restaurantId ||
      req.query.restaurantId ||
      req.params.restaurantId ||
      null
    );
  }

  // RESTAURANT_ADMIN uses their own restaurantId
  return actor?.restaurantId || null;
}

async function getRestaurantVideoCount(restaurantId) {
  // counts total videos across all menu items for this restaurant
  const agg = await MenuItem.aggregate([
    { $match: { restaurantId: MenuItem.db.base.Types.ObjectId(restaurantId) } },
    { $project: { videos: { $ifNull: ["$videos", []] } } },
    { $unwind: { path: "$videos", preserveNullAndEmptyArrays: false } },
    { $count: "count" },
  ]);
  return agg?.[0]?.count || 0;
}

router.post("/menu-image", authAdmin, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const imageUrl = `/uploads/menu/${req.file.filename}`;
  res.json({ imageUrl });
});

/**
 * Upload menu video
 * POST /api/admin/upload/menu-video
 * FormData:
 *  - video: File
 *  - itemId (optional): if provided, enforce per-item limit too
 *  - restaurantId (optional): only needed for SUPER_ADMIN
 */
router.post(
  "/menu-video",
  authAdmin,
  videoUpload.single("video"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const actor = getActor(req);
      if (!actor || !["SUPER_ADMIN", "RESTAURANT_ADMIN"].includes(actor.role)) {
        // delete uploaded file
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(403).json({ message: "Forbidden" });
      }

      const restaurantId = resolveRestaurantId(req);
      if (!restaurantId) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(400).json({ message: "restaurantId is required" });
      }

      const restaurant = await Restaurant.findById(restaurantId)
        .select("restaurantVideoLimit menuItemVideoLimit isActive")
        .lean();

      if (!restaurant || restaurant.isActive === false) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(404).json({ message: "Restaurant not found/inactive" });
      }

      // 1) ✅ enforce overall restaurant video limit
      const totalVideos = await getRestaurantVideoCount(restaurantId);
      const restaurantLimit = Number(restaurant.restaurantVideoLimit ?? 0);

      if (restaurantLimit >= 0 && totalVideos >= restaurantLimit) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(403).json({
          message: `Restaurant video limit reached (${restaurantLimit}). Contact Super Admin to increase limit.`,
        });
      }

      // 2) ✅ enforce per-menu-item video limit (only if itemId is provided)
      const itemId = req.body.itemId || req.query.itemId;
      if (itemId) {
        const item = await MenuItem.findById(itemId).select("videos restaurantId").lean();

        if (!item) {
          try { fs.unlinkSync(req.file.path); } catch {}
          return res.status(404).json({ message: "Menu item not found" });
        }

        // make sure item belongs to same restaurant
        if (String(item.restaurantId) !== String(restaurantId)) {
          try { fs.unlinkSync(req.file.path); } catch {}
          return res.status(403).json({ message: "Item does not belong to this restaurant" });
        }

        const perItemLimit = Number(restaurant.menuItemVideoLimit ?? 0);
        const currentItemVideos = Array.isArray(item.videos) ? item.videos.length : 0;

        if (perItemLimit >= 0 && currentItemVideos >= perItemLimit) {
          try { fs.unlinkSync(req.file.path); } catch {}
          return res.status(403).json({
            message: `Menu item video limit reached (${perItemLimit}). Contact Super Admin to increase limit.`,
          });
        }
      }

      // matches server.js static: app.use("/uploads", express.static("uploads"))
      const videoUrl = `/uploads/menu-videos/${req.file.filename}`;
      return res.json({ videoUrl });
    } catch (err) {
      console.error("menu-video upload error:", err);
      // cleanup if file exists
      if (req.file?.path) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
