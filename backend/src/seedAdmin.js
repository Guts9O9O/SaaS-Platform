// backend/src/seedAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI;
const SALT_ROUNDS = 10;

const run = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB for admin seeding');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@yourapp.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

  let user = await User.findOne({ email: adminEmail });
  if (user) {
    console.log('Admin already exists:', adminEmail);
    process.exit(0);
  }

  const hash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
  user = await User.create({
    name: 'Super Admin',
    email: adminEmail,
    passwordHash: hash,
    role: 'SUPER_ADMIN'
  });

  console.log('Created super admin:', adminEmail);
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
