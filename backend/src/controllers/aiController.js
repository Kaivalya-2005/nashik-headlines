const aiService = require('../services/aiService');

// ─── Health / Status ──────────────────────────────────────────────────────────
// GET /api/ai/health
exports.health = async (req, res, next) => {
  try {
    const result = await aiService.healthCheck();
    res.json({ success: true, data: result });
  } catch (err) { _handleAIError(err, res, next); }
};

// ─── Rewrite ──────────────────────────────────────────────────────────────────
// POST /api/ai/rewrite   body: { text, title? }
exports.rewriteArticle = async (req, res, next) => {
  try {
    const result = await aiService.rewriteArticle(req.body);
    res.json({ success: true, data: result });
  } catch (err) { _handleAIError(err, res, next); }
};

// ─── Summary ──────────────────────────────────────────────────────────────────
// POST /api/ai/summarize   body: { text, title? }
exports.summarizeArticle = async (req, res, next) => {
  try {
    const result = await aiService.generateSummary(req.body);
    res.json({ success: true, data: result });
  } catch (err) { _handleAIError(err, res, next); }
};

// ─── SEO Metadata ─────────────────────────────────────────────────────────────
// POST /api/ai/generate-seo   body: { text, title? }
exports.generateSEO = async (req, res, next) => {
  try {
    const result = await aiService.generateSEO(req.body);
    res.json({ success: true, data: result });
  } catch (err) { _handleAIError(err, res, next); }
};

// ─── Tags ─────────────────────────────────────────────────────────────────────
// POST /api/ai/generate-tags   body: { text, title? }
exports.generateTags = async (req, res, next) => {
  try {
    const result = await aiService.generateTags(req.body);
    res.json({ success: true, data: result });
  } catch (err) { _handleAIError(err, res, next); }
};

// ─── Image prompt ─────────────────────────────────────────────────────────────
// POST /api/ai/generate-image   body: { url, title?, source? }
exports.generateImagePrompt = async (req, res, next) => {
  try {
    const result = await aiService.generateImagePrompt(req.body);
    res.json({ success: true, data: result });
  } catch (err) { _handleAIError(err, res, next); }
};

// ─── Generate full article ────────────────────────────────────────────────────
// POST /api/ai/generate-article   body: { url, title?, source? }
exports.generateArticle = async (req, res, next) => {
  try {
    const result = await aiService.generateArticle(req.body);
    res.json({ success: true, data: result });
  } catch (err) { _handleAIError(err, res, next); }
};

// ─── Agent articles list ──────────────────────────────────────────────────────
// GET /api/ai/articles?limit=20&category=...&status=...
exports.getAgentArticles = async (req, res, next) => {
  try {
    const result = await aiService.getAgentArticles(req.query);
    res.json({ success: true, data: result });
  } catch (err) { _handleAIError(err, res, next); }
};

// ─── Agent memory snapshot ────────────────────────────────────────────────────
// GET /api/ai/memory
exports.getMemory = async (req, res, next) => {
  try {
    const result = await aiService.getMemory();
    res.json({ success: true, data: result });
  } catch (err) { _handleAIError(err, res, next); }
};

// ─── Shared AI error handler ──────────────────────────────────────────────────
function _handleAIError(err, res, next) {
  // 503 = agent server not running; surface a clear message
  if (err.statusCode === 503) {
    return res.status(503).json({
      success : false,
      message : 'AI agent service is not running. Start it with: python manus_agents/run_agents.py --api',
      detail  : err.message,
    });
  }
  next(err); // other errors → global errorHandler
}
