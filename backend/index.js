require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Serve uploaded images as static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

require("./services/aiPipeline/queue"); // Initialize BullMQ Queue and Worker

// Enable CORS for React frontend
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:5000"
  ],
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
app.use("/api/wordle", require("./routes/wordle"));

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Backend running 🚀",
    version: "1.0",
    api: "http://localhost:5000/api"
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
  console.log(`Server running on port ${PORT} 🚀`);
  console.log(`API: http://localhost:${PORT}/api`);
  console.log(`React: Connect to http://localhost:5173`);
});