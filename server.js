import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import categoriesRouter from './routes/categories.js';
import menuRouter from './routes/menu.js';
import ordersRouter from './routes/orders.js';
import uploadRouter from './routes/upload.js';
import offeringsRouter from './routes/offerings.js';
import authRouter from './routes/auth.js';
import paymentConfigRouter from './routes/paymentConfig.js';
import reviewsRouter from './routes/reviews.js';
import { Category } from './models/Category.js';
import { MenuItem } from './models/MenuItem.js';
import { Order } from './models/Order.js';
import { Offering } from './models/Offering.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local fallback upload images if used
app.use('/images/uploads', express.static(path.resolve(__dirname, 'uploads')));
app.use('/images/uploads', express.static(path.resolve(__dirname, '../Frontend/public/images/uploads')));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/items', menuRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/offerings', offeringsRouter);
app.use('/api/specialties', offeringsRouter);
app.use('/api/payment-config', paymentConfigRouter);
app.use('/api/google-reviews', reviewsRouter);

// Root health check endpoint (vital for Render/Cloud platforms)
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Pastry Paws Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      menu: '/api/items',
      categories: '/api/categories',
      offerings: '/api/offerings',
      orders: '/api/orders',
      system: '/api/system/status',
    },
  });
});

// Health & System status endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Pastry Paws Backend API',
  });
});

app.get('/api/system/status', async (req, res) => {
  try {
    const mongoState = mongoose.connection.readyState; // 1 = connected
    const [itemsCount, catsCount, ordersCount, offeringsCount] = await Promise.all([
      MenuItem.countDocuments().catch(() => 0),
      Category.countDocuments().catch(() => 0),
      Order.countDocuments().catch(() => 0),
      Offering.countDocuments().catch(() => 0),
    ]);

    const isCloudinaryConfigured = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      success: true,
      database: {
        status: mongoState === 1 ? 'Connected' : 'Disconnected',
        connected: mongoState === 1,
        host: mongoose.connection.host || 'MongoDB Atlas',
        name: mongoose.connection.name || 'pastrypaws',
      },
      cloudinary: {
        configured: isCloudinaryConfigured,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'Configured in Backend',
        folder: process.env.CLOUDINARY_FOLDER || 'PastryPaws',
      },
      counts: {
        menuItems: itemsCount,
        categories: catsCount,
        orders: ordersCount,
        offerings: offeringsCount,
      },
      serverTime: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Production: serve built React frontend if present
if (process.env.NODE_ENV === 'production' || process.argv.includes('--production')) {
  const distPath = path.resolve(__dirname, '../frontend/dist');
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🍰 Pastry Paws Server running on port ${PORT}`);
});
