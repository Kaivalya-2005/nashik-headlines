const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Created upload directory:', uploadDir);
    }
} catch (error) {
    console.error('Error creating upload directory:', error);
}

// Storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Sanitize original name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, 'img-' + uniqueSuffix + ext);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Allowed mime types
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        // Create an error object with a specific code
        const error = new Error('Invalid file type. Only JPEG, PNG, WEBP are allowed.');
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit
    },
    fileFilter: fileFilter
});

module.exports = upload;
