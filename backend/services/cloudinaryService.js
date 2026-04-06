const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Parse CLOUDINARY_URL from .env
const parseCloudinaryUrl = () => {
  const url = process.env.CLOUDINARY_URL;
  if (!url) {
    throw new Error('CLOUDINARY_URL not configured in .env');
  }
  
  // Format: cloudinary://api_key:api_secret@cloud_name
  const match = url.match(/cloudinary:\/\/(.+):(.+)@(.+)/);
  if (!match) {
    throw new Error('Invalid CLOUDINARY_URL format');
  }
  
  return {
    api_key: match[1],
    api_secret: match[2],
    cloud_name: match[3]
  };
};

// Configure cloudinary
const config = parseCloudinaryUrl();
cloudinary.config({
  cloud_name: config.cloud_name,
  api_key: config.api_key,
  api_secret: config.api_secret
});

/**
 * Upload image to Cloudinary from file path
 * @param {string} filePath - Path to the image file
 * @param {object} options - Upload options (folder, resource_type, etc)
 * @returns {object} - Response with secure_url and public_id
 */
const uploadImage = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'nashik-headlines/articles',
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto',
      ...options
    });

    return {
      secure_url: result.secure_url,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image to delete
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param {array} files - Array of file objects from multer
 * @returns {array} - Array of upload results
 */
const uploadImages = async (files) => {
  try {
    const uploadPromises = files.map((file) =>
      uploadImage(file.path, {
        folder: 'nashik-headlines/articles',
        original_filename: file.originalname.replace(/\.[^/.]+$/, ''), // Remove extension
        quality: 'auto',
        fetch_format: 'auto'
      }).then((result) => {
        // Delete local file after successful upload
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting local file:', err);
        });
        return result;
      })
    );

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Bulk upload error:', error);
    throw error;
  }
};

module.exports = {
  uploadImage,
  deleteImage,
  uploadImages,
  cloudinary
};
