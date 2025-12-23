const express = require('express');
const router = express.Router();
const OtpLog = require('../models/OtpLog');
const Customer = require('../models/Customer');
const { sendSMS } = require('../utils/smsProvider');
const crypto = require('crypto');

const OTP_EXPIRE_MIN = parseInt(process.env.OTP_EXPIRE_MIN || '5', 10);

// POST /api/otp/request
router.post('/request', async (req, res) => {
  try {
    const phone = String(req.body.phone || '').trim();
    if (!phone) {
      return res.status(400).json({ message: 'Phone is required' });
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRE_MIN * 60 * 1000);

    await OtpLog.create({
      phone,
      code,
      expiresAt,
      attempts: 0,
      used: false,
    });

    await sendSMS(
      phone,
      `Your OTP code is ${code}. It expires in ${OTP_EXPIRE_MIN} minutes.`
    );

    console.log('OTP GENERATED:', phone, code); // ✅ DEV DEBUG

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/otp/verify
router.post('/verify', async (req, res) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const otp = String(req.body.otp || '').trim();

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    const log = await OtpLog.findOne({
      phone,
      code: otp,
      used: false,
    }).sort({ createdAt: -1 });

    console.log('VERIFY DEBUG:', {
      phone,
      incomingOtp: otp,
      storedOtp: log?.code,
    });

    if (!log) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (log.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    log.used = true;
    await log.save();

    let customer = await Customer.findOne({ phone });
    if (!customer) {
      customer = await Customer.create({
        phone,
        lastSeen: new Date(),
      });
    } else {
      customer.lastSeen = new Date();
      await customer.save();
    }

    return res.json({
      success: true,
      customer: {
        id: customer._id,
        phone: customer.phone,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
