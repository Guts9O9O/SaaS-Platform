const ServiceRequest = require("../../models/ServiceRequest");

exports.listRequests = async (req, res) => {
  try {
    const { restaurantId, status, type } = req.query;

    const q = {};
    if (restaurantId) q.restaurantId = restaurantId;
    if (status) q.status = status;
    if (type) q.type = type;

    const items = await ServiceRequest.find(q).sort({ createdAt: -1 }).limit(200);
    return res.json({ requests: items });
  } catch (err) {
    console.error("listRequests error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.ackRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await ServiceRequest.findById(id);
    if (!doc) return res.status(404).json({ message: "Request not found" });

    if (doc.status === "CLOSED") {
      return res.status(400).json({ message: "Request already closed" });
    }

    doc.status = "ACK";
    doc.ackAt = new Date();
    await doc.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant_${doc.restaurantId}`).emit("service_request_update", {
        request: doc,
      });
    }

    return res.json({ message: "Acknowledged", request: doc });
  } catch (err) {
    console.error("ackRequest error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.closeRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await ServiceRequest.findById(id);
    if (!doc) return res.status(404).json({ message: "Request not found" });

    doc.status = "CLOSED";
    doc.closedAt = new Date();
    await doc.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant_${doc.restaurantId}`).emit("service_request_update", {
        request: doc,
      });
    }

    return res.json({ message: "Closed", request: doc });
  } catch (err) {
    console.error("closeRequest error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
