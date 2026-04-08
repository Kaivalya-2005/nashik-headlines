/**
 * migrate_articles_pg.js
 * ----------------------
 * Idempotent migration (PostgreSQL/Supabase) to add missing columns
 * to the articles table that the AI pipeline now populates:
 *
 *   image_url          TEXT
 *   readability_score  INT
 *   ai_confidence      INT
 *   quality_score      INT
 *   needs_review       BOOLEAN
 *   language           VARCHAR(10)
 *   raw_article_id     INT
 *   quality_warnings   TEXT
 *
 * Run once: node migrate_articles_pg.js
 * Safe to re-run — skips columns that already exist.
 */

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const NEW_COLUMNS = [
  { name: "image_url",         definition: "TEXT DEFAULT ''" },
  { name: "readability_score", definition: "INTEGER DEFAULT 0" },
  { name: "ai_confidence",     definition: "INTEGER DEFAULT 0" },
  { name: "quality_score",     definition: "INTEGER DEFAULT 0" },
  { name: "needs_review",      definition: "BOOLEAN DEFAULT FALSE" },
  { name: "language",          definition: "VARCHAR(10) DEFAULT 'mr'" },
  { name: "raw_article_id",    definition: "INTEGER" },
  { name: "quality_warnings",  definition: "TEXT DEFAULT '[]'" },
];

async function columnExists(client, tableName, columnName) {
  const res = await client.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = $1
       AND column_name  = $2`,
    [tableName, columnName]
  );
  return parseInt(res.rows[0].cnt, 10) > 0;
}

async function run() {
  const client = await pool.connect();
  console.log("✅ Connected to PostgreSQL (Supabase)");

  try {
    for (const col of NEW_COLUMNS) {
      const exists = await columnExists(client, "articles", col.name);
      if (exists) {
        console.log(`  ⏭  articles.${col.name} already exists — skipped`);
      } else {
        await client.query(
          `ALTER TABLE articles ADD COLUMN IF NOT EXISTS ${col.name} ${col.definition}`
        );
        console.log(`  ✅  Added articles.${col.name}`);
      }
    }
    console.log("\n✅ Migration complete.");
  } finally {
    client.release();
    await pool.end();
    console.log("🔌 Connection closed.");
  }
}

run().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
