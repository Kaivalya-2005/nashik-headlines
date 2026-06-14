require("dotenv").config({ override: true });
const express = require("express");
const cors = require("cors");
const path = require("path");

// ── Global safety net — MUST be first ────────────────────────────────────────
process.on("uncaughtException", (err) => {
  // EADDRINUSE / EACCES are fatal — can’t recover, must exit clearly
  if (err.code === "EADDRINUSE" || err.code === "EACCES") {
    console.error(`[FATAL] Port already in use or permission denied: ${err.message}`);
    console.error("       Kill the existing process with:  fuser -k 5000/tcp");
    process.exit(1);
  }
  console.error("[FATAL] Uncaught Exception — keeping server alive:", err.message);
  console.error(err.stack);
});

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Promise Rejection — keeping server alive:");
  console.error(reason);
});

// Prevent OS signals from killing the server during long AI requests (30-60s)
process.on("SIGTERM", () => console.warn("[Signal] SIGTERM received — ignoring, server stays up"));
process.on("SIGHUP",  () => console.warn("[Signal] SIGHUP received  — ignoring, server stays up"));

// Always log why the process exits (helps diagnose future crashes)
process.on("exit", (code) => {
  console.log(`[Process] Exiting with code ${code}`);
});
// ─────────────────────────────────────────────────────────────────────────────

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

// Backend status check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy",
    backend: "connected",
    timestamp: new Date().toISOString()
  });
});

// ── Global Express error handler (catches any next(err) from routes) ──────────
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

// Catch port-already-in-use BEFORE the uncaughtException handler sees it
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error(`   Run this to free it:  fuser -k ${PORT}/tcp`);
    process.exit(1);
  }
  console.error("[Server Error]:", err.message);
  process.exit(1);
});