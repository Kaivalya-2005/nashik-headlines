/**
 * migrate_pipeline.js
 * -------------------
 * Safe, idempotent migration to extend raw_articles.status ENUM
 * to support the full AI pipeline lifecycle.
 *
 * Run once:  node migrate_pipeline.js
 * Safe to re-run: checks current ENUM definition first.
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

const REQUIRED_ENUM = [
  "pending",
  "processing",
  "processed",
  "duplicate",
  "failed",
];

async function run() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log("✅ Connected to MySQL:", DB_CONFIG.database);

  try {
    // ── 1. Check current ENUM values ──────────────────────────────────────
    const [cols] = await conn.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'raw_articles' AND COLUMN_NAME = 'status'`,
      [DB_CONFIG.database]
    );

    if (!cols || cols.length === 0) {
      console.error("❌ raw_articles.status column not found. Run import_db.js first.");
      process.exit(1);
    }

    const currentType = cols[0].COLUMN_TYPE; // e.g. "enum('pending','processed','failed')"
    console.log("Current column type:", currentType);

    const alreadyMigrated = REQUIRED_ENUM.every((v) =>
      currentType.includes(`'${v}'`)
    );

    if (alreadyMigrated) {
      console.log("✅ Migration already applied — nothing to do.");
      return;
    }

    // ── 2. Apply the migration ─────────────────────────────────────────────
    const enumDef = REQUIRED_ENUM.map((v) => `'${v}'`).join(",");
    const sql = `ALTER TABLE raw_articles MODIFY COLUMN status ENUM(${enumDef}) DEFAULT 'pending'`;

    console.log("⚙️  Applying migration:", sql);
    await conn.query(sql);
    console.log("✅ Migration complete — raw_articles.status updated.");

    // ── 3. Ensure logs table exists (created by unified_schema if not) ─────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        step VARCHAR(50),
        message TEXT,
        status ENUM('info','warning','error') DEFAULT 'info',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (step),
        INDEX (status)
      )
    `);
    console.log("✅ logs table confirmed.");

  } finally {
    await conn.end();
    console.log("🔌 Connection closed.");
  }
}

run().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
