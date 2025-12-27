const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET || 'replace_this_secret';
const SALT_ROUNDS = 10;

// POST /api/admin/register  (optional - usually done by super admin or seed)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'RESTAURANT_ADMIN', restaurantId = null } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name,
      email,
      passwordHash: hash,
      role,
      restaurantId: restaurantId || null
    });

    return res.json({ success: true, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Admin register error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { userId: user._id, role: user.role, restaurantId: user.restaurantId || null };
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

    // optionally set cookie
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId || null,
      },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});
// GET /api/admin/auth/me
// Returns current logged-in admin context
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: 'Missing token' });
    }

    const decoded = jwt.verify(token, jwtSecret);

    const user = await User.findById(decoded.userId)
      .select('_id name email role restaurantId')
      .lean();

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId || null,
      },
    });
  } catch (err) {
    console.error('Admin me error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
});

module.exports = router;
