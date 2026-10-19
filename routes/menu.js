import express from 'express';
import { MenuItem } from '../models/MenuItem.js';
import { deleteFromCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// GET all menu items (with optional category filter)
router.get('/', async (req, res) => {
  try {
    const filter = { isAvailable: true };
    if (req.query.category && req.query.category !== 'All') {
      filter.category = req.query.category;
    }

    const items = await MenuItem.find(filter).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single item
router.get('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create menu item
router.post('/', async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      image,
      cloudinaryPublicId,
      googleDriveFileId,
      alt,
      featured,
      badge,
      pricingDetails,
    } = req.body;

    if (!title || !category) {
      return res.status(400).json({ success: false, message: 'Title and category are required' });
    }

    // Auto-calculate starting price and price display string from pricing details
    let startingPrice = 0;
    let priceDisplay = '';

    if (pricingDetails && pricingDetails.length > 0) {
      // Extract numeric values from price strings like "₹159/-" or "159"
      const parsedPrices = pricingDetails.map((p) => {
        const num = parseInt(String(p.price).replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? 0 : num;
      }).filter((n) => n > 0);

      if (parsedPrices.length > 0) {
        startingPrice = Math.min(...parsedPrices);
      }

      priceDisplay = pricingDetails
        .map((p) => `${p.size}: ${p.price}`)
        .join(' • ');
    }

    const customId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    const newItem = await MenuItem.create({
      id: customId,
      title: title.trim(),
      category: category.trim(),
      description: description ? description.trim() : '',
      image: image || 'https://res.cloudinary.com/ku59ko3p/image/upload/v1792430625/PastryPaws/hero-cake.jpg',
      cloudinaryPublicId: cloudinaryPublicId || '',
      googleDriveFileId: googleDriveFileId || '',
      alt: alt || title.trim(),
      featured: Boolean(featured),
      badge: badge ? badge.trim() : '',
      pricingDetails: pricingDetails || [],
      startingPrice,
      priceDisplay,
    });

    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update menu item
router.put('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const {
      title,
      category,
      description,
      image,
      cloudinaryPublicId,
      googleDriveFileId,
      alt,
      featured,
      badge,
      pricingDetails,
      isAvailable,
      order,
    } = req.body;

    if (title) item.title = title.trim();
    if (category) item.category = category.trim();
    if (description !== undefined) item.description = description.trim();
    if (image) item.image = image;
    if (cloudinaryPublicId !== undefined) item.cloudinaryPublicId = cloudinaryPublicId;
    if (googleDriveFileId !== undefined) item.googleDriveFileId = googleDriveFileId;
    if (alt !== undefined) item.alt = alt;
    if (featured !== undefined) item.featured = Boolean(featured);
    if (badge !== undefined) item.badge = badge.trim();
    if (isAvailable !== undefined) item.isAvailable = Boolean(isAvailable);
    if (order !== undefined) item.order = Number(order);

    if (pricingDetails && pricingDetails.length > 0) {
      item.pricingDetails = pricingDetails;
      const parsedPrices = pricingDetails.map((p) => {
        const num = parseInt(String(p.price).replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? 0 : num;
      }).filter((n) => n > 0);

      if (parsedPrices.length > 0) {
        item.startingPrice = Math.min(...parsedPrices);
      }
      item.priceDisplay = pricingDetails
        .map((p) => `${p.size}: ${p.price}`)
        .join(' • ');
    }

    await item.save();
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE menu item
router.delete('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Clean up image from Cloudinary if uploaded
    if (item.cloudinaryPublicId) {
      await deleteFromCloudinary(item.cloudinaryPublicId);
    }

    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
