/**
 * services/aiService.js
 *
 * Bridges Node.js backend → manus_agents Python FastAPI (port 8002).
 *
 * The Python server is started separately with:
 *   python manus_agents/run_agents.py --api
 *
 * API base: process.env.AI_SERVICE_URL  (default: http://localhost:8002)
 */

const http  = require('http');
const https = require('https');

const AI_BASE = (process.env.AI_SERVICE_URL || 'http://localhost:8002').replace(/\/$/, '');

// ─── Generic HTTP helper ──────────────────────────────────────────────────────
function callAI(path, body = null, method = 'POST') {
  return new Promise((resolve, reject) => {
    const url      = new URL(AI_BASE + path);
    const payload  = body ? JSON.stringify(body) : null;
    const lib      = url.protocol === 'https:' ? https : http;

    const options = {
      hostname : url.hostname,
      port     : url.port || (url.protocol === 'https:' ? 443 : 80),
      path     : url.pathname + url.search,
      method,
      headers  : { 'Content-Type': 'application/json', ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}) },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            const err = new Error(parsed.detail || `AI service error ${res.statusCode}`);
            err.statusCode = res.statusCode;
            return reject(err);
          }
          resolve(parsed);
        } catch {
          reject(new Error('AI service returned invalid JSON'));
        }
      });
    });

    req.on('error', (e) => {
      const err = new Error(`Cannot reach AI service at ${AI_BASE}: ${e.message}`);
      err.statusCode = 503;
      reject(err);
    });

    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Health check ─────────────────────────────────────────────────────────────
exports.healthCheck = () => callAI('/health', null, 'GET');

// ─── Rewrite article ─────────────────────────────────────────────────────────
// Calls: POST /ai/rewrite  →  { rewritten: string }
exports.rewriteArticle = ({ text, title = '' }) => {
  if (!text) throw Object.assign(new Error('text is required'), { statusCode: 400 });
  return callAI('/ai/rewrite', { text, title });
};

// ─── Generate summary ─────────────────────────────────────────────────────────
// Calls: POST /ai/summary  →  { summary: string }
exports.generateSummary = ({ text, title = '' }) => {
  if (!text) throw Object.assign(new Error('text is required'), { statusCode: 400 });
  return callAI('/ai/summary', { text, title });
};

// ─── Generate SEO metadata ────────────────────────────────────────────────────
// Calls: POST /ai/seo  →  { slug, meta_title, meta_description, keywords }
exports.generateSEO = ({ text, title = '' }) => {
  if (!text) throw Object.assign(new Error('text is required'), { statusCode: 400 });
  return callAI('/ai/seo', { text, title });
};

// ─── Generate tags  ───────────────────────────────────────────────────────────
// Reuses SEO endpoint which returns keywords; caller extracts keywords array
exports.generateTags = async ({ text, title = '' }) => {
  if (!text) throw Object.assign(new Error('text is required'), { statusCode: 400 });
  const result = await callAI('/ai/seo', { text, title });
  // keywords may be a comma-separated string or an array
  let tags = result.keywords || [];
  if (typeof tags === 'string') tags = tags.split(',').map(t => t.trim()).filter(Boolean);
  return { tags };
};

// ─── Generate image prompt ────────────────────────────────────────────────────
// Reuses process-url pipeline which returns image_prompt
exports.generateImagePrompt = async ({ url, title = '', source = 'api' }) => {
  if (!url) throw Object.assign(new Error('url is required'), { statusCode: 400 });
  const result = await callAI('/ai/process-url', { url, title, source });
  return { image_prompt: result.image_prompt || '' };
};

// ─── Generate full article from URL ──────────────────────────────────────────
// Calls: POST /ai/process-url  →  full article object
exports.generateArticle = ({ url, title = '', source = 'api' }) => {
  if (!url) throw Object.assign(new Error('url is required'), { statusCode: 400 });
  return callAI('/ai/process-url', { url, title, source });
};

// ─── Fetch articles from agent memory ────────────────────────────────────────
exports.getAgentArticles = ({ limit = 20, category = null, status = null } = {}) => {
  const params = new URLSearchParams({ limit });
  if (category) params.set('category', category);
  if (status)   params.set('status', status);
  return callAI(`/ai/articles?${params}`, null, 'GET');
};

// ─── Agent memory snapshot ───────────────────────────────────────────────────
exports.getMemory = () => callAI('/ai/memory', null, 'GET');
