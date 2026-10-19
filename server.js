import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import categoriesRouter from './routes/categories.js';
import menuRouter from './routes/menu.js';
import ordersRouter from './routes/orders.js';
import uploadRouter from './routes/upload.js';

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
app.use('/api/categories', categoriesRouter);
app.use('/api/items', menuRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/upload', uploadRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Pastry Paws Backend API',
  });
});

// Production: serve built React frontend
if (process.env.NODE_ENV === 'production' || process.argv.includes('--production')) {
  const distPath = path.resolve(__dirname, '../frontend/dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🍰 Pastry Paws Server running on http://localhost:${PORT}`);
});
