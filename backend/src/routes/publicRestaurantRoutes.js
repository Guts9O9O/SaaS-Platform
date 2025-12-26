const express = require("express");
const Restaurant = require("../models/Restaurant");
const Table = require("../models/Table");

const router = express.Router();

/**
 * PUBLIC
 * Validate restaurant + table from QR
 * GET /api/public/restaurant/:slug/table/:tableCode
 */
router.get(
  "/restaurant/:slug/table/:tableCode",
  async (req, res) => {
    try {
      const { slug, tableCode } = req.params;

      const restaurant = await Restaurant.findOne({
        slug,
        isActive: true,
      });

      if (!restaurant) {
        return res.status(404).json({
          message: "Restaurant not found or inactive",
        });
      }

      const table = await Table.findOne({
        restaurantId: restaurant._id,
        tableCode,
        isActive: true,
      });

      if (!table) {
        return res.status(404).json({
          message: "Table not found or inactive",
        });
      }

      return res.json({
        restaurant: {
          _id: restaurant._id,
          name: restaurant.name,
          slug: restaurant.slug,
        },
        table: {
          _id: table._id,
          tableCode: table.tableCode,
        },
      });
    } catch (error) {
      console.error("PUBLIC TABLE VALIDATION ERROR:", error);
      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

module.exports = router;
