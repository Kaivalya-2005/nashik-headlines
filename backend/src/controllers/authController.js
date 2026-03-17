const authService = require('../services/authService');

// Cookie options ─────────────────────────────────────────────────────────────
const COOKIE_OPTIONS = {
  httpOnly : true,
  secure   : process.env.NODE_ENV === 'production', // false in dev
  sameSite : 'lax',
  maxAge   : 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// POST /api/auth/login ────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await authService.login(email, password);

    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(200).json({ success: true, user });
  } catch (err) { next(err); }
};

// POST /api/auth/logout ───────────────────────────────────────────────────────
exports.logout = (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// GET /api/auth/me ────────────────────────────────────────────────────────────
exports.getCurrentUser = async (req, res, next) => {
  try {
    // req.user is attached by verifyToken middleware
    res.status(200).json({ success: true, user: req.user });
  } catch (err) { next(err); }
};
