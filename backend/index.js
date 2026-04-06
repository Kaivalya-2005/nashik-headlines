require("dotenv").config({ override: true });
const express = require("express");
const cors = require("cors");
const path = require("path");

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

require("./services/aiPipeline/queue"); // Initialize BullMQ Queue and Worker

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  const apiBase = process.env.PUBLIC_API_URL || `http://localhost:${PORT}/api`;
  console.log(`Server running on port ${PORT} 🚀`);
  console.log(`API: ${apiBase}`);
  console.log(`Allowed CORS origins: ${corsOrigins.join(", ")}`);
});