const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key_here";

// Login endpoint
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  
  // The frontend sends 'email', but we use 'username' in DB, so we'll match it.
  const username = email;

  if (!username || !password) {
    return res.status(400).json({ message: "Username/Email and password are required" });
  }

  try {
    db.query(
      "SELECT * FROM admin_users WHERE username = ?",
      [username],
      async (err, results) => {
        if (err) {
          console.error("Login DB error:", err);
          return res.status(500).json({ message: "Internal server error" });
        }

        if (results.length === 0) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = results[0];
        
        // Compare password safely
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        // Update last_login
        db.query(
          "UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
          [user.id]
        );

        // Generate JWT
        const token = jwt.sign(
          { id: user.id, username: user.username, role: user.role },
          JWT_SECRET,
          { expiresIn: "24h" }
        );

        res.json({
          message: "Login successful",
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        });
      }
    );
  } catch (error) {
    console.error("Login attempt error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

// Logout endpoint (if needed by frontend)
router.post("/auth/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
