const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");
const { runPipeline, log } = require("./pipelineService");
const db = require("../../db");

// ── Redis / BullMQ setup (crash-safe) ────────────────────────────────────────
let connection = null;
let articleQueue = null;
let articleWorker = null;

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

  const result = await dbQuery(
    `INSERT INTO articles
      (title, content, summary, category_id, status,
       seo_title, meta_description, slug, keywords, seo_score, source_id)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
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
      sourceId || null,
    ]
  );
  log("save", `Article saved — articles.id=${result.insertId}, slug="${slug}"`);
  return result.insertId;
}

// ── Initialize BullMQ queue + worker (safe — won't crash if Redis is down) ────
try {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || "redis://127.0.0.1:6379";
  connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 5000,
    retryStrategy: (times) => {
      if (times > 3) {
        console.warn("⚠️  Redis unavailable — BullMQ queue disabled. Article pipeline will not run.");
        return null; // stop retrying
      }
      return Math.min(times * 500, 2000);
    }
  });

  connection.on("error", (err) => {
    if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
      // Silently ignore — queue disabled
    } else {
      console.error("Redis error:", err.message);
    }
  });

  articleQueue = new Queue("article-processing", { connection });

  articleWorker = new Worker("article-processing", async job => {
    const rawArticle = job.data.rawArticle;
    const rawId = rawArticle.id;

    log("worker", `Processing job ${job.id} for raw_article #${rawId}`);
    await dbQuery("UPDATE raw_articles SET status='processing' WHERE id=?", [rawId]);

    try {
      const processed = await runPipeline(rawArticle);

      const dupId = await findDuplicate(processed.title);
      if (dupId) {
        log("worker", `Duplicate detected for #${rawId} -> dup of articles.id=${dupId}`, "warning");
        await dbQuery("UPDATE raw_articles SET status='duplicate' WHERE id=?", [rawId]);
        return { success: true, duplicate: true, duplicate_of: dupId };
      }

      const articleId = await saveArticle(processed);
      await dbQuery("UPDATE raw_articles SET status='processed' WHERE id=?", [rawId]);
      log("worker", `Job ${job.id} completed. Saved as articles.id=${articleId}`);
      return { success: true, article_id: articleId };
    } catch (err) {
      log("worker", `Job ${job.id} failed: ${err.message}`, "error");
      await dbQuery("UPDATE raw_articles SET status='failed' WHERE id=?", [rawId]);
      if (err.qualityFail) {
        throw new Error(`Quality check failed: ${err.message}`);
      }
      throw err;
    }
  }, {
    connection,
    concurrency: 1,
    limiter: {
      max: 1,
      duration: 8000
    }
  });

  articleWorker.on("failed", (job, err) => {
    console.log(`Job ${job.id} failed with reason: ${err.message}`);
  });

  console.log("✅ BullMQ queue and worker initialized");
} catch (err) {
  console.warn("⚠️  BullMQ/Redis initialization failed — queue disabled.", err.message);
}

module.exports = {
  articleQueue,
  articleWorker,
  dbQuery,
  findDuplicate,
  saveArticle
};
