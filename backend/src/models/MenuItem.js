const mongoose = require("mongoose");

const MenuItemSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuCategory",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    images: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    variants: [
      {
        name: String,
        price: Number,
      },
    ],

    addons: [
      {
        name: String,
        price: Number,
      },
    ],
  },
  { timestamps: true }
);

MenuItemSchema.index(
  { restaurantId: 1, categoryId: 1, name: 1 },
  { unique: true }
);

module.exports = mongoose.models.MenuItem||
  mongoose.model("MenuItem", MenuItemSchema);
