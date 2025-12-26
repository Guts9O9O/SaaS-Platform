// backend/src/seed.js
require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for seeding');
  } catch (err) {
    console.error('DB connect error', err);
    process.exit(1);
  }
};

const Restaurant = require('./models/Restaurant');
const Table = require('./models/Table');
const MenuCategory = require('./models/MenuCategory');
const MenuItem = require('./models/MenuItem');

const run = async () => {
  await connectDB();

  // Clean optional — comment out if you don't want to drop
  // await Restaurant.deleteMany({});
  // await Table.deleteMany({});
  // await MenuCategory.deleteMany({});
  // await MenuItem.deleteMany({});

  // Create demo restaurant
  const slug = 'demo-restaurant';
  let restaurant = await Restaurant.findOne({ slug });
  if (!restaurant) {
    restaurant = await Restaurant.create({
      name: 'Demo Restaurant',
      slug,
      ownerName: 'Demo Owner',
      ownerEmail: 'owner@demo.com',
      logoUrl: '',
      isActive: true,
      subscriptionEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) // +1 year
    });
    console.log('Created restaurant:', restaurant._id.toString());
  } else {
    console.log('Restaurant already exists:', restaurant._id.toString());
  }

  // Create a table
  const tableCode = 'T1';
  let table = await Table.findOne({ restaurantId: restaurant._id, tableCode });
  if (!table) {
    table = await Table.create({
      restaurantId: restaurant._id,
      tableCode,
      isActive: true
    });
    console.log('Created table:', table._id.toString());
  } else {
    console.log('Table already exists:', table._id.toString());
  }

  // Create categories
  const categoriesData = [
    { name: 'Starters', order: 1 },
    { name: 'Main Course', order: 2 },
    { name: 'Beverages', order: 3 }
  ];
  const catIds = {};
  for (const c of categoriesData) {
    let cat = await MenuCategory.findOne({ restaurantId: restaurant._id, name: c.name });
    if (!cat) {
      cat = await MenuCategory.create({ restaurantId: restaurant._id, name: c.name, order: c.order });
      console.log('Created category', c.name);
    } else {
      console.log('Category exists', c.name);
    }
    catIds[c.name] = cat._id;
  }

  // Create items
  const items = [
    { name: 'Paneer Butter Masala', description: 'Creamy paneer curry', price: 220, category: 'Main Course' },
    { name: 'Garlic Naan', description: 'Buttery naan with garlic', price: 40, category: 'Main Course' },
    { name: 'Veg Spring Roll', description: 'Crispy rolls', price: 120, category: 'Starters' },
    { name: 'Cold Coffee', description: 'Iced coffee', price: 80, category: 'Beverages' }
  ];

  for (const it of items) {
    let existing = await MenuItem.findOne({ restaurantId: restaurant._id, name: it.name });
    if (!existing) {
      await MenuItem.create({
        restaurantId: restaurant._id,
        categoryId: catIds[it.category],
        name: it.name,
        description: it.description,
        price: it.price,
        images: [],
        isAvailable: true
      });
      console.log('Created item', it.name);
    } else {
      console.log('Item exists', it.name);
    }
  }

  console.log('Seeding completed.');
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
