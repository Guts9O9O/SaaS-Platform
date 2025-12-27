const mongoose = require("mongoose");
const Bill = require("../../models/Bill");

// ---------- helpers ----------
function normalizeRange(rangeRaw) {
  const r = String(rangeRaw || "today").toLowerCase();
  if (r === "today") return { key: "today", days: 1 };
  if (r === "7d" || r === "7days") return { key: "7d", days: 7 };
  if (r === "30d" || r === "30days" || r === "month") return { key: "30d", days: 30 };
  return null;
}

function safe2(n) {
  return Number(Number(n || 0).toFixed(2));
}

function getRestaurantContext(req) {
  const role = req.admin?.role;
  const restaurantId =
    role === "SUPER_ADMIN"
      ? (req.query.restaurantId || req.admin?.restaurantId)
      : req.admin?.restaurantId;

  if (!restaurantId) return null;

  const s = String(restaurantId);
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
}

function offsetToTzString(offsetMin) {
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

/**
 * Build UTC instants for a LOCAL-day window (restaurant timezone)
 */
function buildDateWindow(days) {
  const offsetMin = Number(process.env.RESTAURANT_TZ_OFFSET_MINUTES || 0);
  const offsetMs = offsetMin * 60 * 1000;

  // "Now" in local wall-clock (by shifting UTC time)
  const nowLocal = new Date(Date.now() + offsetMs);

  // End of local today
  const endLocal = new Date(nowLocal);
  endLocal.setHours(23, 59, 59, 999);

  // Start of local window
  const startLocal = new Date(endLocal);
  startLocal.setDate(startLocal.getDate() - (days - 1));
  startLocal.setHours(0, 0, 0, 0);

  // Convert local instants back to UTC instants for Mongo query
  const start = new Date(startLocal.getTime() - offsetMs);
  const end = new Date(endLocal.getTime() - offsetMs);

  return { start, end, offsetMin, offsetMs, tz: offsetToTzString(offsetMin) };
}

/**
 * Format a UTC Date into YYYY-MM-DD in restaurant local time
 */
function toLocalYMD(dateUtc, offsetMs) {
  return new Date(dateUtc.getTime() + offsetMs).toISOString().slice(0, 10);
}

// ---------- controllers ----------

/**
 * GET /api/admin/revenue/daily
 */
exports.getDailyRevenue = async (req, res) => {
  try {
    const restaurantId = getRestaurantContext(req);
    if (!restaurantId) return res.status(400).json({ message: "Restaurant context missing" });

    const { start, end } = buildDateWindow(1);

    const rows = await Bill.aggregate([
      {
        $match: {
          restaurantId,
          status: "CLOSED",
          closedAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalBills: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ["$grandTotal", 0] } },
        },
      },
    ]);

    const totalBills = rows[0]?.totalBills || 0;
    const totalRevenue = safe2(rows[0]?.totalRevenue || 0);
    const averageBillValue = totalBills ? safe2(totalRevenue / totalBills) : 0;

    return res.json({
      totalBills,
      totalRevenue,
      averageBillValue,
      // UI compatibility alias
      averageBill: averageBillValue,
    });
  } catch (err) {
    console.error("Daily revenue error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/admin/revenue/monthly
 */
exports.getMonthlyRevenue = async (req, res) => {
  try {
    const restaurantId = getRestaurantContext(req);
    if (!restaurantId) return res.status(400).json({ message: "Restaurant context missing" });

    const { tz } = buildDateWindow(1);

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const agg = await Bill.aggregate([
      {
        $match: {
          restaurantId,
          status: "CLOSED",
          closedAt: { $gte: start, $lte: end },
        },
      },
      {
        $project: {
          grandTotal: { $ifNull: ["$grandTotal", 0] },
          day: {
            $dateToString: { format: "%Y-%m-%d", date: "$closedAt", timezone: tz },
          },
        },
      },
      {
        $group: {
          _id: "$day",
          revenue: { $sum: "$grandTotal" },
          bills: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyBreakdown = agg.map((r) => ({
      date: r._id,
      revenue: safe2(r.revenue || 0),
      bills: r.bills || 0,
    }));

    const totalBills = dailyBreakdown.reduce((s, d) => s + (d.bills || 0), 0);
    const totalRevenue = safe2(dailyBreakdown.reduce((s, d) => s + (d.revenue || 0), 0));

    return res.json({
      month: start.toISOString().slice(0, 7),
      totalBills,
      totalRevenue,
      dailyBreakdown,
    });
  } catch (err) {
    console.error("Monthly revenue error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/admin/revenue/summary?range=today|7d|30d
 */
exports.getRevenueSummary = async (req, res) => {
  try {
    const restaurantId = getRestaurantContext(req);
    if (!restaurantId) return res.status(400).json({ message: "Restaurant context missing" });

    const range = normalizeRange(req.query.range);
    if (!range) return res.status(400).json({ message: "Invalid range. Use today|7d|30d" });

    const { start, end, offsetMs, tz } = buildDateWindow(range.days);

    const agg = await Bill.aggregate([
      {
        $match: {
          restaurantId,
          status: "CLOSED",
          closedAt: { $gte: start, $lte: end },
        },
      },
      {
        $project: {
          grandTotal: { $ifNull: ["$grandTotal", 0] },
          day: {
            $dateToString: { format: "%Y-%m-%d", date: "$closedAt", timezone: tz },
          },
        },
      },
      {
        $group: {
          _id: "$day",
          revenue: { $sum: "$grandTotal" },
          bills: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const map = new Map();
    for (const r of agg) {
      map.set(r._id, { revenue: safe2(r.revenue || 0), bills: r.bills || 0 });
    }

    // Fill missing days using LOCAL day strings
    const dailyBreakdown = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      const localDate = toLocalYMD(cursor, offsetMs);
      const v = map.get(localDate) || { revenue: 0, bills: 0 };
      dailyBreakdown.push({ date: localDate, revenue: v.revenue, bills: v.bills });

      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
    }

    const totalBills = dailyBreakdown.reduce((s, d) => s + d.bills, 0);
    const totalRevenue = safe2(dailyBreakdown.reduce((s, d) => s + d.revenue, 0));
    const averageBillValue = totalBills ? safe2(totalRevenue / totalBills) : 0;

    return res.json({
      range: range.key,
      totalBills,
      totalRevenue,
      averageBillValue,
      averageBill: averageBillValue, // UI compatibility
      dailyBreakdown,
    });
  } catch (err) {
    console.error("Revenue summary error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/admin/revenue/trend?range=today|7d|30d
 */
exports.getRevenueTrend = async (req, res) => {
  try {
    const restaurantId = getRestaurantContext(req);
    if (!restaurantId) return res.status(400).json({ message: "Restaurant context missing" });

    const range = normalizeRange(req.query.range);
    if (!range) return res.status(400).json({ message: "Invalid range. Use today|7d|30d" });

    const { start, end, offsetMs, tz } = buildDateWindow(range.days);

    const agg = await Bill.aggregate([
      {
        $match: {
          restaurantId,
          status: "CLOSED",
          closedAt: { $gte: start, $lte: end },
        },
      },
      {
        $project: {
          grandTotal: { $ifNull: ["$grandTotal", 0] },
          day: {
            $dateToString: { format: "%Y-%m-%d", date: "$closedAt", timezone: tz },
          },
        },
      },
      {
        $group: {
          _id: "$day",
          revenue: { $sum: "$grandTotal" },
          bills: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const map = new Map();
    for (const r of agg) map.set(r._id, { revenue: safe2(r.revenue || 0), bills: r.bills || 0 });

    const daily = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      const localDate = toLocalYMD(cursor, offsetMs);
      const v = map.get(localDate) || { revenue: 0, bills: 0 };
      daily.push({ date: localDate, revenue: v.revenue, bills: v.bills });

      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
    }

    return res.json({
      range: range.key,
      daily,
    });
  } catch (err) {
    console.error("Revenue trend error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/admin/revenue/top-items?range=today|7d|30d&limit=10
 */
exports.getTopItems = async (req, res) => {
  try {
    const restaurantId = getRestaurantContext(req);
    if (!restaurantId) return res.status(400).json({ message: "Restaurant context missing" });

    const range = normalizeRange(req.query.range);
    if (!range) return res.status(400).json({ message: "Invalid range. Use today|7d|30d" });

    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));
    const { start, end } = buildDateWindow(range.days);

    const rows = await Bill.aggregate([
      {
        $match: {
          restaurantId,
          status: "CLOSED",
          closedAt: { $gte: start, $lte: end },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.itemId",
          name: { $first: "$items.name" },
          quantity: { $sum: { $ifNull: ["$items.quantity", 0] } },
          revenue: { $sum: { $ifNull: ["$items.lineTotal", 0] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
    ]);

    return res.json({
      range: range.key,
      items: rows.map((r) => ({
        itemId: r._id,
        name: r.name,
        quantity: r.quantity || 0,
        revenue: safe2(r.revenue || 0),
      })),
    });
  } catch (err) {
    console.error("Top items error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
