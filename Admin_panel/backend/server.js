const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars immediately
dotenv.config();

const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const articleRoutes = require('./routes/articleRoutes');
const agentRoutes = require('./routes/agentRoutes');

// Initialize app
const app = express();

// Connect to database
connectDB().then(() => {
    console.log('✅ Database connection initialized');
}).catch((err) => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
});

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

// Body Parsing Middleware
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/agents', agentRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error Handling Middleware
// Error Handling Middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    // Handle Multer Errors (File too large, etc)
    if (err.name === 'MulterError') {
        try {
            require('fs').appendFileSync(require('path').join(__dirname, 'debug_upload_error.txt'), new Date().toISOString() + ' [MULTER ERROR 400] - ' + err.message + '\n');
        } catch (e) { }

        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 25MB per image.' });
        }
        return res.status(400).json({ message: `Upload Error: ${err.message}` });
    }

    if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ message: err.message });
    }

    // Debug logging for 500 errors
    if (statusCode === 500) {
        console.error('Global Error Handler:', err);
        try {
            const fs = require('fs');
            const path = require('path');
            fs.appendFileSync(path.join(__dirname, 'debug_upload_error.txt'),
                new Date().toISOString() + ' [GLOBAL] - ' + err.message + '\n' + err.stack + '\n');
        } catch (fileErr) {
            console.error('Failed to write debug log:', fileErr);
        }
    }

    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
