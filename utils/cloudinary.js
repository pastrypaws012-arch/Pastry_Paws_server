import { v2 as cloudinary } from 'cloudinary';
import stream from 'stream';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary from environment variables
function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Uploads an image buffer to Cloudinary with automatic optimization.
 * Gracefully falls back to local uploads if Cloudinary is not configured.
 */
export async function uploadToCloudinary({ buffer, originalname, mimetype }) {
  // 1. If Cloudinary credentials are set, upload directly to Cloudinary CDN
  if (isCloudinaryConfigured()) {
    try {
      // Re-configure in case env was loaded late
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });

      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'pastry_paws',
            transformation: [
              { quality: 'auto', fetch_format: 'auto' }, // Automatic WebP & modern compression
            ],
          },
          (error, result) => {
            if (error) return reject(error);
            resolve({
              success: true,
              imageUrl: result.secure_url,
              publicId: result.public_id,
              storage: 'cloudinary',
            });
          }
        );

        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);
        bufferStream.pipe(uploadStream);
      });
    } catch (error) {
      console.error('Cloudinary Upload Error:', error.message);
      // Fall through to local fallback
    }
  }

  // 2. Fallback to local uploads folder if Cloudinary keys not yet configured
  try {
    const uploadsDir = path.resolve(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeFileName = `upload_${Date.now()}_${originalname.replace(/\s+/g, '_')}`;
    const filePath = path.join(uploadsDir, safeFileName);
    fs.writeFileSync(filePath, buffer);

    return {
      success: true,
      imageUrl: `/images/uploads/${safeFileName}`,
      publicId: '',
      storage: 'local_fallback',
    };
  } catch (localError) {
    console.error('Local File Save Error:', localError.message);
    throw new Error('Failed to upload image');
  }
}

/**
 * Deletes an image from Cloudinary by its public ID
 */
export async function deleteFromCloudinary(publicId) {
  if (!publicId || !isCloudinaryConfigured()) return false;

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Cloudinary Delete Error:', error.message);
    return false;
  }
}
