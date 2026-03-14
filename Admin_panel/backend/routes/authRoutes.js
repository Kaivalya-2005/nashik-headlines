const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '15m',
    });
};

const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.REFRESH_SECRET, {
        expiresIn: '7d',
    });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log('Login attempt:', req.body); // DEBUG
        const user = await User.findOne({ email });
        console.log('User found:', user ? user.email : 'No user'); // DEBUG

        if (user && (await user.comparePassword(password))) {
            const accessToken = generateToken(user._id);
            const refreshToken = generateRefreshToken(user._id);

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.json({
                _id: user._id,
                email: user.email,
                role: user.role,
                token: accessToken,
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (with valid refresh token cookie)
router.post('/refresh', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ message: 'No refresh token' });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);

        // Check if user still exists
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        const accessToken = generateToken(user._id);

        res.json({ token: accessToken });
    } catch (error) {
        return res.status(403).json({ message: 'Invalid refresh token' });
    }
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
router.post('/logout', (req, res) => {
    res.cookie('refreshToken', '', {
        httpOnly: true,
        expires: new Date(0),
    });
    res.status(200).json({ message: 'Logged out successfully' });
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

module.exports = router;
