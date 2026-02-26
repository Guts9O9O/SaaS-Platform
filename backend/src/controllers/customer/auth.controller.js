const bcrypt = require("bcryptjs");
const Customer = require("../../models/Customer");
const CustomerOtp = require("../../models/CustomerOtp");
const { sendOtp, normalizeIndianPhone } = require("../../utils/smsProvider");

// ✅ FIX: Use the shared normalizer from smsProvider so phone format
// is always consistent between OTP creation and lookup
function normalizePhone(phone) {
  return normalizeIndianPhone(phone);
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

exports.requestOtp = async (req, res) => {
  try {
    const session = req.customerSession;
    const { phone, purpose } = req.body;
    const p = normalizePhone(phone);

    if (!p || p.length !== 10) {
      return res.status(400).json({ message: "Valid 10-digit phone number is required" });
    }
    if (!["LOGIN", "REGISTER"].includes(purpose)) {
      return res.status(400).json({ message: "Invalid purpose" });
    }

    // Rate limit: max 1 active OTP per phone+purpose+session
    await CustomerOtp.deleteMany({
      restaurantId: session.restaurantId,
      phone: p,
      purpose,
      sessionId: session.sessionId,
    });

    // For LOGIN: ensure customer exists
    if (purpose === "LOGIN") {
      const existing = await Customer.findOne({
        restaurantId: session.restaurantId,
        phone: p,
      });
      if (!existing) {
        return res.status(404).json({
          message: "No account found. Please register first.",
        });
      }
    }

    // For REGISTER: if already exists, suggest login
    if (purpose === "REGISTER") {
      const existing = await Customer.findOne({
        restaurantId: session.restaurantId,
        phone: p,
      });
      if (existing) {
        return res.status(409).json({
          message: "Account already exists. Please login instead.",
        });
      }
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    await CustomerOtp.create({
      restaurantId: session.restaurantId,
      phone: p,
      purpose,
      otpHash,
      expiresAt,
      sessionId: session.sessionId,
    });

    // ✅ FIX: Send real SMS via Fast2SMS instead of just console.log
    const smsResult = await sendOtp(p, otp);
    if (!smsResult.success && !smsResult.dev) {
      // OTP was created in DB but SMS failed — clean it up
      await CustomerOtp.deleteMany({
        restaurantId: session.restaurantId,
        phone: p,
        purpose,
        sessionId: session.sessionId,
      });
      return res.status(500).json({
        message: "Failed to send OTP. Please try again.",
      });
    }

    return res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("requestOtp error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const session = req.customerSession;
    const { phone, otp, purpose, name } = req.body;
    const p = normalizePhone(phone);

    if (!p || !otp) {
      return res.status(400).json({ message: "Phone and OTP are required" });
    }
    if (!["LOGIN", "REGISTER"].includes(purpose)) {
      return res.status(400).json({ message: "Invalid purpose" });
    }

    const record = await CustomerOtp.findOne({
      restaurantId: session.restaurantId,
      phone: p,
      purpose,
      sessionId: session.sessionId,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(401).json({ message: "OTP expired or not found. Please request a new one." });
    }

    if (record.attempts >= record.maxAttempts) {
      await CustomerOtp.deleteOne({ _id: record._id });
      return res.status(429).json({
        message: "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    const ok = await bcrypt.compare(String(otp), record.otpHash);
    if (!ok) {
      record.attempts += 1;
      await record.save();
      const remaining = record.maxAttempts - record.attempts;
      return res.status(401).json({
        message: `Incorrect OTP. ${remaining} attempt(s) remaining.`,
      });
    }

    // OTP correct — consume it
    await CustomerOtp.deleteOne({ _id: record._id });

    let customer;

    if (purpose === "REGISTER") {
      if (!name || !String(name).trim()) {
        return res.status(400).json({ message: "Name is required for registration" });
      }
      customer = await Customer.create({
        restaurantId: session.restaurantId,
        name: String(name).trim(),
        phone: p,
        isPhoneVerified: true,
        lastLoginAt: new Date(),
      });
    } else {
      customer = await Customer.findOne({
        restaurantId: session.restaurantId,
        phone: p,
      });
      if (!customer) {
        return res.status(401).json({ message: "Account not found" });
      }
      customer.isPhoneVerified = true;
      customer.lastLoginAt = new Date();
      await customer.save();
    }

    // Link session to customer
    session.customerId = customer._id;
    session.phone = p;
    await session.save();

    return res.json({
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
      },
    });
  } catch (err) {
    console.error("verifyOtp error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.me = async (req, res) => {
  try {
    const session = req.customerSession;
    if (!session.customerId) {
      return res.status(401).json({ message: "Not logged in" });
    }
    const customer = await Customer.findById(session.customerId).select(
      "name phone"
    );
    if (!customer) {
      return res.status(401).json({ message: "Customer not found" });
    }
    return res.json({ customer });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};