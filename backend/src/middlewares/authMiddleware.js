const jwt         = require('jsonwebtoken');
const authService = require('../services/authService');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_in_env';

// ─── verifyToken ──────────────────────────────────────────────────────────────
// Reads JWT from HTTP-only cookie, verifies it, and attaches the db user to req.
exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized – no token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Unauthorized – invalid or expired token' });
    }

    // Re-fetch from DB so revoked accounts are rejected immediately
    const user = await authService.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized – user no longer exists' });
    }

    req.user = user; // { id, name, email, role, created_at }
    next();
  } catch (err) {
    next(err);
  }
};

// ─── authorizeRoles ───────────────────────────────────────────────────────────
// Usage: router.post('/publish', verifyToken, authorizeRoles('admin'), handler)
exports.authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success : false,
      message : `Forbidden – requires role: ${roles.join(' or ')}`,
    });
  }
  next();
};
