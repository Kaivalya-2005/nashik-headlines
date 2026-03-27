/**
 * migrate_quality.js
 * ------------------
 * Safe, idempotent migration to add quality score columns to articles table:
 *   quality_score      INT  (composite quality score 0-100)
 *   readability_score  INT  (readability score 0-100)
 *   ai_confidence      INT  (AI-rated confidence 0-100)
 *
 * Run: node migrate_quality.js
 * Safe to re-run — skips columns that already exist.
 */

require("dotenv").config();
const mysql = require("mysql2/promise");

const DB_CONFIG = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DB || "nashik_headlines",
  port: process.env.MYSQL_PORT || 3306,
};

const NEW_COLUMNS = [
  { name: "quality_score",     definition: "INT DEFAULT 0 COMMENT 'Composite quality score 0-100'" },
  { name: "readability_score", definition: "INT DEFAULT 0 COMMENT 'Readability score 0-100'" },
  { name: "ai_confidence",     definition: "INT DEFAULT 0 COMMENT 'AI confidence rating 0-100'" },
];

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_CONFIG.database, table, column]
  );
  return rows[0].cnt > 0;
}

async function run() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log("✅ Connected to:", DB_CONFIG.database);

  try {
    for (const col of NEW_COLUMNS) {
      const exists = await columnExists(conn, "articles", col.name);
      if (exists) {
        console.log(`  ⏭  articles.${col.name} already exists — skipped`);
      } else {
        await conn.query(`ALTER TABLE articles ADD COLUMN ${col.name} ${col.definition}`);
        console.log(`  ✅  Added articles.${col.name}`);
      }
    }
    console.log("✅ Migration complete.");
  } finally {
    await conn.end();
    console.log("🔌 Connection closed.");
  }
}

run().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
