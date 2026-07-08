import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config';
import fs from 'fs';
import { logger } from './logger';

// Configure cloudinary if credentials are provided
const isCloudinaryConfigured = !!(
  config.cloudinary.cloudName &&
  config.cloudinary.apiKey &&
  config.cloudinary.apiSecret
);

if (isCloudinaryConfigured && process.env.NODE_ENV !== 'test') {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
  logger.info(`Cloudinary configured with cloud_name="${config.cloudinary.cloudName}". Running connectivity test...`);

  // Verify credentials work at startup
  (async () => {
    try {
      await cloudinary.api.ping();
      logger.info('✅ Cloudinary connection verified successfully.');
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || String(err);
      logger.error(`❌ Cloudinary credential test FAILED: ${msg}`);
      logger.error(`   Cloud Name used: "${config.cloudinary.cloudName}"`);
      logger.error('   Fix: Go to https://cloudinary.com/console and copy the exact cloud name (lowercase, as shown on the dashboard).');
      logger.error('   Then update CLOUDINARY_CLOUD_NAME in your .env file and restart the server.');
    }
  })();
} else {
  logger.warn('Cloudinary credentials not provided. Storing files locally.');
}

export { isCloudinaryConfigured };

/**
 * Uploads a local file to Cloudinary and deletes the local file afterward.
 * @param filePath Path to the local file
 * @param folder Cloudinary folder name (e.g. 'screenshots', 'avatars')
 * @param customFolder Optional custom path to store files in
 * @returns Object with secure_url and public_id, or null if Cloudinary is not configured.
 */
export const uploadToCloudinary = async (
  filePath: string,
  folder: string,
  customFolder?: string
): Promise<{ secureUrl: string; publicId: string } | null> => {
  if (!isCloudinaryConfigured) {
    return null;
  }

  try {
    const uploadFolder = customFolder ? customFolder : `ems/${folder}`;
    const result = await cloudinary.uploader.upload(filePath, {
      folder: uploadFolder,
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto',
    });

    // Delete local file after upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      secureUrl: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    const err = error as any;
    const detail = err?.error?.message || err?.message || String(error);
    const httpCode = err?.http_code || err?.status || '';
    logger.error(`Failed to upload file to Cloudinary: [${httpCode}] ${detail}`);
    logger.error(`  File path: ${filePath}`);
    throw error;
  }
};

/**
 * Deletes a file from Cloudinary by its public ID.
 * @param publicId Cloudinary asset public ID
 * @returns boolean indicating success status of deletion
 */
export const deleteFromCloudinary = async (
  publicId: string
): Promise<boolean> => {
  if (!isCloudinaryConfigured || !publicId) {
    return false;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    logger.error('Failed to delete file from Cloudinary:', error);
    return false;
  }
};

/**
 * Generates a thumbnail URL from a Cloudinary URL with specified transformations.
 * @param secureUrl Cloudinary secure URL
 * @returns Transformed URL or same URL if not a Cloudinary URL
 */
export const getCloudinaryThumbnail = (secureUrl: string): string => {
  if (!secureUrl.includes('res.cloudinary.com')) {
    return secureUrl;
  }
  // Insert width 300, height 200, fit transformation into the URL path
  // E.g. https://res.cloudinary.com/cloud_name/image/upload/v12345/folder/name.jpg
  // becomes https://res.cloudinary.com/cloud_name/image/upload/w_300,h_200,c_fit/v12345/folder/name.jpg
  return secureUrl.replace('/upload/', '/upload/w_300,h_200,c_fit/');
};
