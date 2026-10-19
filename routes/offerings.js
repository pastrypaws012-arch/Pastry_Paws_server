import express from 'express';
import mongoose from 'mongoose';
import { Offering } from '../models/Offering.js';

const router = express.Router();

// Helper to safely match either custom string `id` or MongoDB `_id` without CastError
const buildQuery = (idParam) => {
  if (!idParam) return { id: '__invalid__' };
  if (mongoose.isValidObjectId(idParam)) {
    return { $or: [{ id: idParam }, { _id: idParam }] };
  }
  return { id: idParam };
};

// GET all offerings
router.get('/', async (req, res) => {
  try {
    const offerings = await Offering.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, count: offerings.length, data: offerings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single offering
router.get('/:id', async (req, res) => {
  try {
    const offering = await Offering.findOne(buildQuery(req.params.id));
    if (!offering) {
      return res.status(404).json({ success: false, message: 'Offering not found' });
    }
    res.json({ success: true, data: offering });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create offering (Strict Maximum of 4 Offerings)
router.post('/', async (req, res) => {
  try {
    const existingCount = await Offering.countDocuments({ isActive: true });
    if (existingCount >= 4) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 4 offerings limit reached (UI restriction). Please edit or delete an existing offering to add a new one.',
      });
    }

    const {
      title,
      subtitle,
      description,
      price,
      image,
      cloudinaryPublicId,
      accent,
      number,
      link,
      order,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const customId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    const newOffering = await Offering.create({
      id: customId,
      number: number || `0${existingCount + 1}`,
      title: title.trim(),
      subtitle: subtitle ? subtitle.trim() : '',
      description: description ? description.trim() : '',
      price: price ? price.trim() : '',
      image: image || 'https://res.cloudinary.com/ku59ko3p/image/upload/v1792430625/PastryPaws/hero-cake.jpg',
      cloudinaryPublicId: cloudinaryPublicId || '',
      accent: accent ? accent.trim() : '',
      link: link || '#contact',
      order: order !== undefined ? Number(order) : existingCount + 1,
      isActive: true,
    });

    res.status(201).json({ success: true, data: newOffering });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update offering
router.put('/:id', async (req, res) => {
  try {
    const offering = await Offering.findOne(buildQuery(req.params.id));
    if (!offering) {
      return res.status(404).json({ success: false, message: 'Offering not found' });
    }

    const fields = [
      'number',
      'title',
      'subtitle',
      'description',
      'price',
      'image',
      'cloudinaryPublicId',
      'accent',
      'link',
      'order',
      'isActive',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        offering[field] = req.body[field];
      }
    });

    await offering.save();
    res.json({ success: true, data: offering });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE offering
router.delete('/:id', async (req, res) => {
  try {
    const offering = await Offering.findOneAndDelete(buildQuery(req.params.id));
    if (!offering) {
      return res.status(404).json({ success: false, message: 'Offering not found' });
    }
    res.json({ success: true, message: 'Offering deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
