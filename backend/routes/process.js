const express = require("express");
const router = express.Router();

const db = require("../db");
const { processWithAI } = require("../services/ai");
const { buildSeoPayload } = require("../services/seo");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

        db.query(
          `INSERT INTO articles
          (title, content, summary, category, tags, seo_title, meta_description, slug, keywords, image_alt, seo_score, source)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ai.title,
            ai.content,
            ai.summary,
            ai.category,
            JSON.stringify(ai.tags),
            seoData.seo_title,
            seoData.meta_description,
            seoData.slug,
            seoData.keywords,
            seoData.image_alt,
            seoData.seo_score,
            "ai"
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