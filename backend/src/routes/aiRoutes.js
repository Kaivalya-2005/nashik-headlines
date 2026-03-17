const express     = require('express');
const router      = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const aiController    = require('../controllers/aiController');

// All AI routes require admin login
router.use(verifyToken);

// ─── Health (check Ollama + agent server) ─────────────────────────────────────
router.get ('/health',            aiController.health);

// ─── Text transformation ──────────────────────────────────────────────────────
// body: { text, title? }
router.post('/rewrite',           aiController.rewriteArticle);
router.post('/summarize',         aiController.summarizeArticle);
router.post('/generate-seo',      aiController.generateSEO);
router.post('/generate-tags',     aiController.generateTags);

// ─── Content generation from URL ─────────────────────────────────────────────
// body: { url, title?, source? }
router.post('/generate-image',    aiController.generateImagePrompt);
router.post('/generate-article',  aiController.generateArticle);

// ─── Agent introspection ──────────────────────────────────────────────────────
router.get ('/articles',          aiController.getAgentArticles);
router.get ('/memory',            aiController.getMemory);

module.exports = router;
