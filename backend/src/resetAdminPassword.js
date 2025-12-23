// backend/src/resetAdminPassword.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const email = process.argv[2];
  const newPassword = process.argv[3];
  if (!email || !newPassword) {
    console.error('Usage: node src/resetAdminPassword.js admin@demo.com NewPass123');
    process.exit(1);
  }
  const user = await User.findOne({ email });
  if (!user) {
    console.error('User not found:', email);
    process.exit(1);
  }
  const hash = await bcrypt.hash(newPassword, 10);
  user.passwordHash = hash;
  await user.save();
  console.log('Password updated for', email);
  process.exit(0);
};

run().catch(e => { console.error(e); process.exit(1); });
