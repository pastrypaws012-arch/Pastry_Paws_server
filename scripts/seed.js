import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Category } from '../models/Category.js';
import { MenuItem } from '../models/MenuItem.js';
import { categories, creationsData } from '../data/seedData.js';

dotenv.config();

async function seedData() {
  console.log('🌱 Starting MongoDB Atlas Database Seeding...');
  const connected = await connectDB();
  if (!connected) {
    console.error('❌ Could not connect to MongoDB Atlas. Ensure MONGODB_URI is set in your .env file.');
    process.exit(1);
  }

  try {
    // 1. Seed Categories
    console.log('📁 Seeding Categories...');
    const nonAllCategories = categories.filter((c) => c !== 'All');

    for (let i = 0; i < nonAllCategories.length; i++) {
      const catName = nonAllCategories[i];
      const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      await Category.findOneAndUpdate(
        { name: catName },
        {
          name: catName,
          slug,
          order: i + 1,
          isActive: true,
        },
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Seeded ${nonAllCategories.length} Categories.`);

    // 2. Seed Menu Items
    console.log('🧁 Seeding Menu Items...');
    for (let i = 0; i < creationsData.length; i++) {
      const item = creationsData[i];

      await MenuItem.findOneAndUpdate(
        { id: item.id },
        {
          id: item.id,
          title: item.title,
          category: item.category,
          priceDisplay: item.priceDisplay,
          startingPrice: item.startingPrice,
          description: item.description,
          image: item.image,
          alt: item.alt || item.title,
          featured: Boolean(item.featured),
          badge: item.badge || '',
          tags: item.tags || [],
          pricingDetails: item.pricingDetails || [],
          order: i + 1,
          isAvailable: true,
        },
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Seeded ${creationsData.length} Menu Items successfully!`);

    console.log('🎉 MongoDB Atlas Seeding Finished!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
}

seedData();
