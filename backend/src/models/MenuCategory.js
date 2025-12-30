const mongoose = require("mongoose");

const MenuCategorySchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
    },

    description: String,

    order: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

MenuCategorySchema.index(
  { restaurantId: 1, name: 1 },
  { unique: true }
);

module.exports = mongoose.models.MenuCategory||
  mongoose.model("MenuCategory", MenuCategorySchema);
