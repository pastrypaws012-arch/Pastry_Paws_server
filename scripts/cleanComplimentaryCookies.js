import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { MenuItem } from '../models/MenuItem.js';
import { Offering } from '../models/Offering.js';

dotenv.config();

async function runClean() {
  await connectDB();
  console.log('Connected to MongoDB. Scanning for complimentary cookies references...');

  // Update MenuItems
  const items = await MenuItem.find({
    $or: [
      { description: { $regex: /complimentary/i } },
      { tags: { $regex: /complimentary/i } }
    ]
  });

  console.log(`Found ${items.length} menu items with complimentary text.`);
  for (const item of items) {
    let changed = false;
    if (item.description && /complimentary/i.test(item.description)) {
      item.description = item.description
        .replace(/Includes complimentary mini cookies(\.)?/gi, '')
        .replace(/Complimentary mini cookies included for birthdays(\.)?/gi, 'Handcrafted fresh for celebrations.')
        .replace(/Includes complimentary mini cookies for birthdays(\.)?/gi, 'Handcrafted fresh for celebrations.')
        .replace(/Every birthday cake includes complimentary mini cookies!/gi, 'Handcrafted fresh to order.')
        .trim();
      changed = true;
    }
    if (Array.isArray(item.tags)) {
      const filtered = item.tags.filter(t => !/complimentary/i.test(t));
      if (filtered.length !== item.tags.length) {
        item.tags = filtered;
        changed = true;
      }
    }
    if (changed) {
      await item.save();
      console.log(`Updated MenuItem: ${item.title} (${item.id})`);
    }
  }

  // Update Offerings
  const offerings = await Offering.find({
    $or: [
      { description: { $regex: /complimentary/i } },
      { accent: { $regex: /cookies/i } }
    ]
  });

  console.log(`Found ${offerings.length} offerings with complimentary text.`);
  for (const off of offerings) {
    let changed = false;
    if (off.description && /complimentary/i.test(off.description)) {
      off.description = off.description
        .replace(/Birthday cakes come with complimentary mini cookies!/gi, 'Freshly baked to order for all celebrations!')
        .trim();
      changed = true;
    }
    if (off.accent && /cookies/i.test(off.accent)) {
      off.accent = 'Freshly Baked';
      changed = true;
    }
    if (changed) {
      await off.save();
      console.log(`Updated Offering: ${off.title} (${off.id})`);
    }
  }

  console.log('Finished updating MongoDB.');
  await mongoose.disconnect();
  process.exit(0);
}

runClean().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
