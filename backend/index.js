require("dotenv").config({ override: true });
const express = require("express");
const cors = require("cors");
const path = require("path");

// ── Global safety net ───────────────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  if (err.code === "EADDRINUSE" || err.code === "EACCES") {
    console.error(`[FATAL] Port already in use or permission denied: ${err.message}`);
    process.exit(1);
  }
  console.error("[FATAL] Uncaught Exception:", err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Promise Rejection:", reason);
  process.exit(1);
});

const app = express();
const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : defaultOrigins;

// Serve uploaded images as static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Enable CORS for React frontend
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", require("./routes/auth"));
app.use("/api", require("./routes/scrape"));
app.use("/api", require("./routes/process"));
app.use("/api", require("./routes/articles"));
app.use("/api", require("./routes/stats"));
app.use("/api", require("./routes/ai"));
app.use("/api", require("./routes/publish"));
app.use("/api", require("./routes/seo"));
app.use("/api/pipeline", require("./routes/pipeline"));

// Health check endpoint
app.get("/", (req, res) => {
  const apiBase = process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}/api`;
  res.json({
    message: "Backend running 🚀",
    version: "1.0",
    api: apiBase
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    backend: "connected",
    timestamp: new Date().toISOString()
  });
});

// Global Express error handler
app.use((err, req, res, next) => {
  console.error("[Express Error]:", err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  const apiBase = process.env.PUBLIC_API_URL || `http://localhost:${PORT}/api`;
  console.log(`Server running on port ${PORT} 🚀`);
  console.log(`API: ${apiBase}`);
  console.log(`Allowed CORS origins: ${corsOrigins.join(", ")}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use.`);
    process.exit(1);
  }
  console.error("[Server Error]:", err.message);
  process.exit(1);
});

// Graceful shutdown for process managers and container platforms.
const shutdown = (signal) => {
  console.log(`[Signal] ${signal} received — shutting down gracefully.`);
  server.close(() => {
    console.log("[Process] HTTP server closed.");
    process.exit(0);
  });

  // Do not keep the process alive indefinitely if open connections hang.
  setTimeout(() => {
    console.error("[Process] Graceful shutdown timed out.");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
