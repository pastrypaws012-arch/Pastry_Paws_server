import express from 'express';
import multer from 'multer';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// Memory storage for immediate streaming to Cloudinary CDN
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// POST /api/upload
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    const result = await uploadToCloudinary({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    });

    res.json({
      success: true,
      imageUrl: result.imageUrl,
      url: result.imageUrl,
      publicId: result.publicId,
      public_id: result.publicId,
      storage: result.storage,
      message: result.storage === 'cloudinary' 
        ? 'Uploaded and optimized on Cloudinary CDN!' 
        : 'Saved locally (Add CLOUDINARY keys in .env to upload to Cloudinary)',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
