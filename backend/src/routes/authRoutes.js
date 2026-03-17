const express = require('express');
const router  = express.Router();

const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

// POST /api/auth/login  — public
router.post('/login', authController.login);

// POST /api/auth/logout — public (clears cookie)
router.post('/logout', authController.logout);

// GET  /api/auth/me     — requires valid token
router.get('/me', verifyToken, authController.getCurrentUser);

module.exports = router;
