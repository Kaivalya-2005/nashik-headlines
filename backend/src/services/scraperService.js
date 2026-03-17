const pool = require('../config/db');

/**
 * Check if a raw_article with this URL already exists.
 * Returns true if duplicate.
 */
exports.checkDuplicate = async (url) => {
  const [rows] = await pool.query(
    'SELECT id FROM raw_articles WHERE url = ? LIMIT 1',
    [url]
  );
  return rows.length > 0;
};

/**
 * Insert a new raw article.
 * Expected data: { source_id, title, url, content }
 */
exports.insertRawArticle = async ({ source_id, title, url, content }) => {
  const [result] = await pool.query(
    `INSERT INTO raw_articles (source_id, title, url, content, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [source_id || null, title, url, content || '']
  );

  const [rows] = await pool.query(
    'SELECT * FROM raw_articles WHERE id = ?',
    [result.insertId]
  );

  return rows[0];
};
