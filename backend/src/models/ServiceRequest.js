const mongoose = require("mongoose");

const ServiceRequestSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
      index: true,
    },
    tableCode: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["BILL"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "ACK", "CLOSED"],
      default: "OPEN",
      index: true,
    },
    requestedByCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    ackAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Dedupe helper: only one OPEN BILL per table (dev-friendly)
ServiceRequestSchema.index(
  { restaurantId: 1, tableId: 1, type: 1, status: 1 },
  { name: "uniq_open_req", partialFilterExpression: { status: "OPEN" } }
);

module.exports = mongoose.model("ServiceRequest", ServiceRequestSchema);
