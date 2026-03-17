const express    = require('express');
const router     = express.Router();
const scraperController = require('../controllers/scraperController');

// ─── API Key Middleware ───────────────────────────────────────────────────────
const requireApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'];
  const expected = process.env.SCRAPER_API_KEY;

  if (!expected) {
    // Safety: if SCRAPER_API_KEY is not set, block all requests
    return res.status(500).json({
      success : false,
      message : 'SCRAPER_API_KEY is not configured on the server',
    });
  }

  if (!key || key !== expected) {
    return res.status(401).json({
      success : false,
      message : 'Unauthorized — invalid or missing x-api-key header',
    });
  }

  next();
};

// ─── Routes ───────────────────────────────────────────────────────────────────
// POST /api/internal/scrape
// Body: { source_id, title, url, content }
router.post('/scrape', requireApiKey, scraperController.createRawArticle);

module.exports = router;
