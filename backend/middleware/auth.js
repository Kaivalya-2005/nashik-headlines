const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key_here";

function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role, iat, exp}
    next();
  } catch (ex) {
    console.error("JWT verification error:", ex.message);
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

module.exports = { adminAuth };
