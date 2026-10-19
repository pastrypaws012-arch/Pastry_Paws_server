import { google } from 'googleapis';
import stream from 'stream';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Google Drive client with Service Account
function getDriveClient() {
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return null;
  }

  // Handle newlines in private key if stored in env string
  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT(
    clientEmail,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/drive']
  );

  return google.drive({ version: 'v3', auth });
}

/**
 * Uploads a file buffer to Google Drive.
 * Falls back to local public uploads if Google Drive is not configured.
 */
export async function uploadToGoogleDrive({ buffer, originalname, mimetype }) {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  // 1. If Google Drive credentials configured, upload to Drive
  if (drive && folderId) {
    try {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(buffer);

      const safeFileName = `pastry_paws_${Date.now()}_${originalname.replace(/\s+/g, '_')}`;

      // Upload file to designated Google Drive folder
      const response = await drive.files.create({
        requestBody: {
          name: safeFileName,
          parents: [folderId],
          mimeType: mimetype,
        },
        media: {
          mimeType: mimetype,
          body: bufferStream,
        },
        fields: 'id, name, webViewLink, webContentLink',
      });

      const fileId = response.data.id;

      // Make the uploaded image publicly viewable so website visitors can see it
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // Google's direct fast CDN image view link
      const directImageUrl = `https://lh3.googleusercontent.com/d/${fileId}`;

      return {
        success: true,
        fileId: fileId,
        imageUrl: directImageUrl,
        storage: 'google_drive',
      };
    } catch (error) {
      console.error('Google Drive Upload Error:', error.message);
      // Fallback to local storage if Drive fails
    }
  }

  // 2. Fallback to local uploads folder if Google Drive is not configured
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
      fileId: '',
      imageUrl: `/images/uploads/${safeFileName}`,
      storage: 'local_fallback',
    };
  } catch (localError) {
    console.error('Local File Save Error:', localError.message);
    throw new Error('Failed to upload image to Google Drive and local storage');
  }
}

/**
 * Deletes a file from Google Drive if needed
 */
export async function deleteFromGoogleDrive(fileId) {
  if (!fileId) return false;
  const drive = getDriveClient();
  if (!drive) return false;

  try {
    await drive.files.delete({ fileId });
    return true;
  } catch (error) {
    console.error('Google Drive Delete Error:', error.message);
    return false;
  }
}
