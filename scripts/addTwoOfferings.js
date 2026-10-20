import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Offering } from '../models/Offering.js';

dotenv.config();

async function run() {
  console.log('Connecting to MongoDB Atlas...');
  await connectDB();

  const newOfferings = [
    {
      id: `signature-chocolate-bowls-${Date.now()}`,
      number: '03',
      title: 'Signature Chocolate Bowls',
      subtitle: 'Nutella • Biscoff • Triple Chocolate',
      description: 'Decadent dessert bowls layered with moist chocolate sponge, velvety ganache, and gourmet toppings.',
      price: 'From ₹159/-',
      image: 'https://res.cloudinary.com/ku59ko3p/image/upload/v1792430628/PastryPaws/nutella-bowl.jpg',
      cloudinaryPublicId: 'PastryPaws/nutella-bowl',
      accent: 'Fan Favorite',
      link: '/menu?category=Chocolate%20Bowls',
      order: 3,
      isActive: true,
    },
    {
      id: `molten-choco-lava-cakes-${Date.now() + 1}`,
      number: '04',
      title: 'Molten Choco Lava Cakes',
      subtitle: 'Warm • Rich Belgian Cocoa Center',
      description: 'Freshly baked soft chocolate cake with an irresistible warm molten chocolate center.',
      price: 'From ₹99/-',
      image: 'https://res.cloudinary.com/ku59ko3p/image/upload/v1792430634/PastryPaws/clqa6e6gl1hylxv03lhz.jpg',
      cloudinaryPublicId: 'PastryPaws/clqa6e6gl1hylxv03lhz',
      accent: 'Signature Treat',
      link: '/menu?category=Choco%20Lava%20Cake',
      order: 4,
      isActive: true,
    },
  ];

  for (const off of newOfferings) {
    const existing = await Offering.findOne({ title: off.title });
    if (existing) {
      console.log(`Offering "${off.title}" already exists, updating...`);
      Object.assign(existing, off);
      await existing.save();
      console.log(`Updated: ${off.title}`);
    } else {
      const created = await Offering.create(off);
      console.log(`Created new offering: ${created.title} (ID: ${created.id})`);
    }
  }

  const allOfferings = await Offering.find({ isActive: true }).sort({ order: 1 });
  console.log(`\n🎉 Total Active Offerings now in database: ${allOfferings.length}`);
  allOfferings.forEach((o, idx) => {
    console.log(` ${idx + 1}. [${o.number}] ${o.title} (${o.price}) -> ${o.link}`);
  });

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Error adding offerings:', err);
  process.exit(1);
});
