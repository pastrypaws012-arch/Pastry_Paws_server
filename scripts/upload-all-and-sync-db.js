import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { connectDB } from '../config/db.js';
import { Category } from '../models/Category.js';
import { MenuItem } from '../models/MenuItem.js';
import { categories, creationsData } from '../data/seedData.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const FOLDER = process.env.CLOUDINARY_FOLDER || 'PastryPaws';

async function uploadToCloudinary(source, publicIdHint) {
  try {
    const options = {
      folder: FOLDER,
      overwrite: true,
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    };
    if (publicIdHint) {
      options.public_id = publicIdHint;
    }

    const result = await cloudinary.uploader.upload(source, options);
    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error(`Failed to upload ${source}:`, error.message);
    throw error;
  }
}

async function run() {
  console.log('🚀 Starting Cloudinary Image Upload & Database Sync...');
  console.log(`📁 Target Cloudinary Folder: ${FOLDER}`);

  // 1. Connect to MongoDB Atlas
  const connected = await connectDB();
  if (!connected) {
    console.error('❌ Could not connect to MongoDB Atlas. Check your MONGODB_URI.');
    process.exit(1);
  }

  // 2. Identify all local images in Frontend/public/images
  const frontendImagesDir = path.resolve(__dirname, '../../Frontend/public/images');
  const imageMap = {}; // originalSrc -> { secure_url, public_id }

  if (fs.existsSync(frontendImagesDir)) {
    const localFiles = fs.readdirSync(frontendImagesDir);
    console.log(`\n📸 Uploading ${localFiles.length} local images to Cloudinary (${FOLDER})...`);

    for (const file of localFiles) {
      const ext = path.extname(file);
      const name = path.basename(file, ext);
      const fullPath = path.join(frontendImagesDir, file);
      
      console.log(`   Uploading local file: ${file}...`);
      try {
        const uploaded = await uploadToCloudinary(fullPath, name);
        imageMap[`/images/${file}`] = uploaded;
        imageMap[file] = uploaded;
        console.log(`   ✅ /images/${file} -> ${uploaded.secure_url}`);
      } catch (e) {
        console.error(`   ❌ Failed: ${file}`, e.message);
      }
    }
  }

  // 3. Identify all remote Unsplash images in seedData
  const remoteImages = [...new Set(creationsData.map(c => c.image).filter(img => img.startsWith('http')))];
  console.log(`\n🌐 Uploading ${remoteImages.length} remote menu images to Cloudinary (${FOLDER})...`);

  for (let i = 0; i < remoteImages.length; i++) {
    const remoteUrl = remoteImages[i];
    console.log(`   Uploading remote image [${i + 1}/${remoteImages.length}]...`);
    try {
      const uploaded = await uploadToCloudinary(remoteUrl);
      imageMap[remoteUrl] = uploaded;
      console.log(`   ✅ Cloudinary CDN: ${uploaded.secure_url}`);
    } catch (e) {
      console.error(`   ❌ Failed to upload remote image:`, e.message);
    }
  }

  // 4. Update MongoDB Atlas Categories
  console.log('\n📁 Syncing Categories into MongoDB Atlas...');
  const nonAllCategories = categories.filter((c) => c !== 'All');
  for (let i = 0; i < nonAllCategories.length; i++) {
    const catName = nonAllCategories[i];
    const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await Category.findOneAndUpdate(
      { name: catName },
      { name: catName, slug, order: i + 1, isActive: true },
      { upsert: true, new: true }
    );
  }
  console.log(`✅ Synced ${nonAllCategories.length} Categories.`);

  // 5. Update MongoDB Atlas Menu Items with mapped Cloudinary URLs
  console.log('\n🧁 Syncing 30 Menu Items with Cloudinary URLs into MongoDB Atlas...');
  const updatedItems = [];

  for (let i = 0; i < creationsData.length; i++) {
    const item = { ...creationsData[i] };
    const originalImage = item.image;
    const mapped = imageMap[originalImage];

    if (mapped) {
      item.image = mapped.secure_url;
      item.cloudinaryPublicId = mapped.public_id;
    }

    const doc = await MenuItem.findOneAndUpdate(
      { id: item.id },
      {
        id: item.id,
        title: item.title,
        category: item.category,
        priceDisplay: item.priceDisplay,
        startingPrice: item.startingPrice,
        description: item.description,
        image: item.image,
        cloudinaryPublicId: item.cloudinaryPublicId || '',
        alt: item.alt || item.title,
        featured: Boolean(item.featured),
        tags: item.tags || [],
        badge: item.badge || '',
        pricingDetails: item.pricingDetails || [],
        isAvailable: true,
        order: i + 1,
      },
      { upsert: true, new: true }
    );
    updatedItems.push(doc);
    console.log(`   ✅ [${i + 1}/30] ${item.title} -> ${item.image}`);
  }

  // 6. Save image map to a JSON for reference
  const mapPath = path.resolve(__dirname, '../data/cloudinaryMap.json');
  fs.writeFileSync(mapPath, JSON.stringify(imageMap, null, 2));
  console.log(`\n💾 Saved Cloudinary asset mapping to ${mapPath}`);

  console.log('\n🎉 ALL MENU ITEMS PUSHED TO MONGODB ATLAS WITH CLOUDINARY CDN URLS!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
