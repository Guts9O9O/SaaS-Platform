const mongoose = require("mongoose");

const TableSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    tableCode: {
      type: String,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/* Unique table per restaurant */
TableSchema.index({ restaurantId: 1, tableCode: 1 }, { unique: true });

module.exports = mongoose.models.Table||
  mongoose.model("Table", TableSchema);
