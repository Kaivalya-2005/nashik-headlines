const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key_here";

function adminAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role}
    next();
  } catch (ex) {
    res.status(400).json({ error: "Invalid token." });
  }
}

module.exports = { adminAuth };
