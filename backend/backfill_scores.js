require("dotenv").config();
const mysql = require("mysql2/promise");
const { buildSeoPayload } = require("./services/seo");
const { checkQuality } = require("./services/aiPipeline/qualityAgent");

const DB_CONFIG = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD ?? "password",
  database: process.env.MYSQL_DB || "nashik_headlines",
  port: process.env.MYSQL_PORT || 3306,
};

async function run() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log("✅ Connected to:", DB_CONFIG.database);

  try {
    const [articles] = await conn.query("SELECT id, title, content, summary, seo_title, meta_description, slug, keywords, image_alt, tags FROM articles");
    console.log(`Found ${articles.length} articles to process.`);
    
    for (const article of articles) {
      if (!article.title || !article.content) {
        console.log(`[Skip] Article ID ${article.id} missing title or content.`);
        continue;
      }
      
      console.log(`Processing Article ID ${article.id}: ${article.title.slice(0, 30)}...`);
      
      const seoData = buildSeoPayload(article);
      
      let qualityData;
      try {
        qualityData = await checkQuality(article.title, article.content);
      } catch (err) {
        console.log("Quality check error, using defaults:", err.message);
        qualityData = { readability_score: 50, ai_confidence: 70 };
      }
      
      const quality_score = Math.round(
        qualityData.ai_confidence * 0.5 +
        qualityData.readability_score * 0.3 +
        seoData.seo_score * 0.2
      );

      await conn.query(
        "UPDATE articles SET seo_score=?, quality_score=?, readability_score=?, ai_confidence=? WHERE id=?",
        [
          seoData.seo_score,
          quality_score,
          qualityData.readability_score,
          qualityData.ai_confidence,
          article.id
        ]
      );
      
      console.log(`[Success] ID ${article.id} -> SEO: ${seoData.seo_score}, Readability: ${qualityData.readability_score}, Quality: ${quality_score}`);
      await new Promise(r => setTimeout(r, 1000)); // avoid rate limit formatting Groq
    }

    console.log("✅ Backfill complete.");
  } catch (err) {
    console.error("❌ Backfill failed:", err.message);
  } finally {
    await conn.end();
    console.log("🔌 Connection closed.");
  }
}

run();
