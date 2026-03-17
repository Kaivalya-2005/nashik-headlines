const multer = require('multer');

/**
 * Configure Multer to use memory storage.
 * The file will be kept as a Buffer in memory, which is ideal
 * for processing with Sharp before saving to disk.
 */
const storage = multer.memoryStorage();

// File filter (optional but recommended for security)
const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        const error = new Error('Not an image! Please upload only images.');
        error.statusCode = 400;
        cb(error, false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB limit
    }
});

module.exports = upload;
