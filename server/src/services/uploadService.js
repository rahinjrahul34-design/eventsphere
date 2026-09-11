const config = require('../config');

/**
 * Upload abstraction. With Cloudinary credentials the server could accept
 * multipart uploads and return a hosted URL; in DEMO mode the client submits
 * a public image URL directly and the service simply validates/echoes it.
 */
async function uploadImage({ url, file }) {
  if (url && /^https?:\/\/.+/i.test(url)) {
    return { url, demo: !config.cloudinary.cloudName, provider: config.cloudinary.cloudName ? 'cloudinary' : 'url' };
  }
  if (file) {
    // Real Cloudinary upload would happen here.
    return { url: '', demo: true, error: 'File upload requires Cloudinary configuration. Use an image URL in demo mode.' };
  }
  return { url: '', demo: true, error: 'No image provided' };
}

module.exports = { uploadImage };
