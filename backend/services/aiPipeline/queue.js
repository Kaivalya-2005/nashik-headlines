const { log } = require("./pipelineService");
const db = require("../../db");

// BullMQ/Redis has been disabled. This module keeps the shared DB helpers
// used by the pipeline routes, but no queue/worker is initialized.
const articleQueue = null;
const articleWorker = null;

// ── DB Promise Helpers ────────────────────────────────────────────────────────
function dbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

function bigrams(str) {
  const s = String(str).toLowerCase().replace(/\s+/g, " ").trim();
  const bg = new Set();
  for (let i = 0; i < s.length - 1; i++) bg.add(s.slice(i, i + 2));
  return bg;
}

function similarity(a, b) {
  if (!a || !b) return 0;
  const setA = bigrams(a);
  const setB = bigrams(b);
  const intersection = [...setA].filter((v) => setB.has(v)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

const DUPLICATE_THRESHOLD = 0.80;

async function findDuplicate(candidateTitle) {
  const rows = await dbQuery("SELECT id, title FROM articles ORDER BY created_at DESC LIMIT 200");
  for (const row of rows) {
    if (similarity(candidateTitle, row.title) >= DUPLICATE_THRESHOLD) {
      return row.id;
    }
  }
  return null;
}

async function resolveCategoryId(categoryName) {
  if (!categoryName) return null;
  const slug = String(categoryName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  const rows = await dbQuery("SELECT id FROM categories WHERE slug = ? OR name = ? LIMIT 1", [slug, categoryName]);
  if (rows.length > 0) return rows[0].id;
  const ins = await dbQuery("INSERT INTO categories (name, slug) VALUES (?, ?)", [categoryName, slug]);
  return ins.insertId;
}

async function resolveSourceId(sourceName) {
  if (!sourceName) return null;
  const rows = await dbQuery("SELECT id FROM sources WHERE name = ? LIMIT 1", [sourceName]);
  if (rows.length > 0) return rows[0].id;
  const ins = await dbQuery("INSERT INTO sources (name, url, type) VALUES (?, ?, ?)", [sourceName, "", "api"]);
  return ins.insertId;
}

async function ensureUniqueSlug(slug) {
  let candidate = slug;
  let attempt = 0;
  while (true) {
    const rows = await dbQuery("SELECT id FROM articles WHERE slug = ? LIMIT 1", [candidate]);
    if (rows.length === 0) return candidate;
    attempt++;
    candidate = `${slug}-${Date.now().toString(36)}`;
    if (attempt > 5) break;
  }
  return candidate;
}

async function saveArticle(processed) {
  const categoryId = await resolveCategoryId(processed.category);
  const sourceId = await resolveSourceId(processed.source);
  const slug = await ensureUniqueSlug(processed.slug);

  // Safely serialize quality_warnings (array → JSON string)
  const qualityWarnings = Array.isArray(processed.quality_warnings)
    ? JSON.stringify(processed.quality_warnings)
    : (processed.quality_warnings || "[]");

  const result = await dbQuery(
    `INSERT INTO articles
      (title, content, summary, category_id, status,
       seo_title, meta_description, slug, keywords, seo_score,
       image_url, readability_score, ai_confidence, quality_score,
       needs_review, language, raw_article_id, quality_warnings, source_id)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      processed.title,
      processed.content,
      processed.summary || "",
      categoryId || null,
      processed.seo_title || "",
      processed.meta_description || "",
      slug,
      processed.keywords || "",
      processed.seo_score || 0,
      processed.image_url || "",
      processed.readability_score || 0,
      processed.ai_confidence || 0,
      processed.quality_score || 0,
      processed.needs_review ? true : false,
      processed.language || "mr",
      processed.raw_article_id || null,
      qualityWarnings,
      sourceId || null,
    ]
  );
  log("save", `Article saved — articles.id=${result.insertId}, slug="${slug}", quality:${processed.quality_score}`);
  return result.insertId;
}

module.exports = {
  articleQueue,
  articleWorker,
  dbQuery,
  findDuplicate,
  saveArticle
};
