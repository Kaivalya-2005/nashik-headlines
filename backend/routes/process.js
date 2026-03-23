const express = require("express");
const router = express.Router();

const db = require("../db");
const { processWithAI } = require("../services/ai");
const { buildSeoPayload } = require("../services/seo");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to resolve category ID 
function resolveCategoryId(categoryName) {
  return new Promise((resolve, reject) => {
    if (!categoryName) return resolve(null);
    const slug = String(categoryName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    db.query("SELECT id FROM categories WHERE slug = ? OR name = ? LIMIT 1", [slug, categoryName], (err, results) => {
      if (err) return reject(err);
      if (results && results.length > 0) return resolve(results[0].id);
      db.query("INSERT INTO categories (name, slug) VALUES (?, ?)", [categoryName, slug], (inErr, inRes) => {
        if (inErr) return reject(inErr);
        resolve(inRes.insertId);
      });
    });
  });
}

// Helper to resolve source ID
function resolveSourceId(sourceName) {
  return new Promise((resolve, reject) => {
    if (!sourceName) return resolve(null);
    db.query("SELECT id FROM sources WHERE name = ? LIMIT 1", [sourceName], (err, results) => {
      if (err) return reject(err);
      if (results && results.length > 0) return resolve(results[0].id);
      db.query("INSERT INTO sources (name, url, type) VALUES (?, ?, ?)", [sourceName, '', 'api'], (inErr, inRes) => {
        if (inErr) return reject(inErr);
        resolve(inRes.insertId);
      });
    });
  });
}

router.post("/process", (req, res) => {
  db.query("SELECT * FROM raw_articles WHERE status='pending'", async (err, results) => {
    if (err) return res.status(500).send(err);

    for (const article of results) {
      try {
        const ai = await processWithAI(article.content);
        const seoData = buildSeoPayload({
          title: ai.title,
          content: ai.content,
          summary: ai.summary,
          seo_title: ai.seo_title,
          meta_description: ai.meta_description,
          slug: ai.slug,
          keywords: ai.keywords,
          image_alt: ai.image_alt,
          tags: ai.tags,
        });

        const categoryId = await resolveCategoryId(ai.category || "General");
        const sourceId = await resolveSourceId(article.source || "AI Generated");

        db.query(
          `INSERT INTO articles
          (title, content, summary, category_id, tags, seo_title, meta_description, slug, keywords, image_alt, seo_score, source_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ai.title,
            ai.content,
            ai.summary,
            categoryId,
            JSON.stringify(ai.tags),
            seoData.seo_title,
            seoData.meta_description,
            seoData.slug,
            seoData.keywords,
            seoData.image_alt,
            seoData.seo_score,
            sourceId
          ]
        );

        db.query(
          "UPDATE raw_articles SET status='processed' WHERE id=?",
          [article.id]
        );

        console.log("Processed:", article.id);

        await delay(1500);
      } catch (error) {
        console.log("Error processing:", article.id, error.message);
      }
    }

    res.send("Processing Completed ✅");
  });
});

module.exports = router;
