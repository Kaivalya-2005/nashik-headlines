const pool    = require('../config/db');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET || 'changeme_in_env';
const JWT_EXPIRES = '7d';

// ─── Login ────────────────────────────────────────────────────────────────────
exports.login = async (email, password) => {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.statusCode = 400;
    throw err;
  }

  const [rows] = await pool.query(
    'SELECT * FROM admin_users WHERE email = ? LIMIT 1',
    [email]
  );

  if (!rows.length) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const user = rows[0];

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  // Strip sensitive field before returning
  const { password_hash, ...safeUser } = user;
  return { token, user: safeUser };
};

// ─── Get user by id (used by verifyToken middleware) ─────────────────────────
exports.getUserById = async (id) => {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, created_at FROM admin_users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
};
