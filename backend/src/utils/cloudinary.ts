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

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
  logger.info('Cloudinary initialized successfully.');
} else {
  logger.warn('Cloudinary credentials not provided. Storing files locally.');
}

export { isCloudinaryConfigured };

/**
 * Uploads a local file to Cloudinary and deletes the local file afterward.
 * @param filePath Path to the local file
 * @param folder Cloudinary folder name (e.g. 'screenshots', 'avatars')
 * @returns Object with secure_url and public_id, or null if Cloudinary is not configured.
 */
export const uploadToCloudinary = async (
  filePath: string,
  folder: string
): Promise<{ secureUrl: string; publicId: string } | null> => {
  if (!isCloudinaryConfigured) {
    return null;
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `ems/${folder}`,
      resource_type: 'image',
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
    logger.error('Failed to upload file to Cloudinary:', error);
    // Even if upload fails, clean up local file
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        logger.error('Failed to delete local file after failed upload:', err);
      }
    }
    throw error;
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
