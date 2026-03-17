require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

const errorHandler = require('./middlewares/errorHandler');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const publicRoutes = require('./routes/publicRoutes');
const aiRoutes      = require('./routes/aiRoutes');
const internalRoutes = require('./routes/internalRoutes');

const app = express();

// --- Top Level Middlewares ---

// Security headers
app.use(helmet());

// CORS configuration (adjust origin in production)
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true 
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes); // publicRoutes start at /api
app.use('/api/ai',       aiRoutes);
app.use('/api/internal', internalRoutes);

// --- Error Handling ---
// Should be the last piece of middleware
app.use(errorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Nashik Headlines Backend is running on port ${PORT}`);
});

module.exports = app;
