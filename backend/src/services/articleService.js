const pool = require('../config/db');
const { generateSlug } = require('../utils/slugify');

// ─── Base query with JOINs ──────────────────────────────────────────────────
const BASE_SELECT = `
  SELECT
    p.*,
    c.name  AS category,
    c.slug  AS category_slug,
    s.name  AS source
  FROM processed_articles p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN sources    s ON p.source_id   = s.id
`;

// Attach tags and images to an array of articles
async function _attachRelations(articles) {
  if (!articles.length) return articles;

  const ids = articles.map(a => a.id);

  const [tags] = await pool.query(
    `SELECT at.article_id, t.name
     FROM article_tags at
     JOIN tags t ON at.tag_id = t.id
     WHERE at.article_id IN (?)`,
    [ids]
  );

  const [images] = await pool.query(
    `SELECT * FROM article_images WHERE article_id IN (?) ORDER BY position ASC`,
    [ids]
  );

  const tagMap   = {};
  const imageMap = {};
  for (const tag   of tags)   { (tagMap[tag.article_id]   ??= []).push(tag.name); }
  for (const img   of images) { (imageMap[img.article_id] ??= []).push(img); }

  return articles.map(a => ({
    ...a,
    tags:   tagMap[a.id]   || [],
    images: imageMap[a.id] || [],
  }));
}

// ─── Admin: paginated list ───────────────────────────────────────────────────
exports.getArticles = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM processed_articles'
  );

  const [rows] = await pool.query(
    `${BASE_SELECT} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [Number(limit), Number(offset)]
  );

  return {
    data: await _attachRelations(rows),
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
  };
};

// ─── Admin: single article ───────────────────────────────────────────────────
exports.getArticleById = async (id) => {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE p.id = ?`, [id]);
  if (!rows.length) return null;
  const [article] = await _attachRelations(rows);
  return article;
};

// ─── Admin: create ───────────────────────────────────────────────────────────
exports.createArticle = async (data) => {
  const {
    title, summary = '', content = '',
    category_id = null, source_id = null,
    meta_title = '', meta_description = '',
    status = 'draft', tags = [],
  } = data;

  if (!title) throw Object.assign(new Error('Title is required'), { statusCode: 400 });

  const slug = generateSlug(title);

  const [result] = await pool.query(
    `INSERT INTO processed_articles
       (title, summary, content, category_id, source_id, slug, meta_title, meta_description, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, summary, content, category_id, source_id, slug, meta_title, meta_description, status]
  );

  const articleId = result.insertId;

  // Insert tags
  if (tags.length) {
    for (const tagName of tags) {
      // Upsert tag
      await pool.query('INSERT IGNORE INTO tags (name) VALUES (?)', [tagName]);
      const [[tag]] = await pool.query('SELECT id FROM tags WHERE name = ?', [tagName]);
      await pool.query(
        'INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)',
        [articleId, tag.id]
      );
    }
  }

  return articleId;
};

// ─── Admin: update ───────────────────────────────────────────────────────────
exports.updateArticle = async (id, data) => {
  const {
    title, summary, content,
    category_id, source_id,
    meta_title, meta_description,
    status, tags,
  } = data;

  // Build SET clause dynamically (only provided fields)
  const fields = [];
  const values = [];

  if (title !== undefined)            { fields.push('title = ?');            values.push(title); }
  if (title !== undefined)            { fields.push('slug = ?');             values.push(generateSlug(title)); }
  if (summary !== undefined)          { fields.push('summary = ?');          values.push(summary); }
  if (content !== undefined)          { fields.push('content = ?');          values.push(content); }
  if (category_id !== undefined)      { fields.push('category_id = ?');      values.push(category_id); }
  if (source_id !== undefined)        { fields.push('source_id = ?');        values.push(source_id); }
  if (meta_title !== undefined)       { fields.push('meta_title = ?');       values.push(meta_title); }
  if (meta_description !== undefined) { fields.push('meta_description = ?'); values.push(meta_description); }
  if (status !== undefined)           { fields.push('status = ?');           values.push(status); }

  if (fields.length) {
    values.push(id);
    await pool.query(`UPDATE processed_articles SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  // Update tags if provided
  if (tags !== undefined) {
    await pool.query('DELETE FROM article_tags WHERE article_id = ?', [id]);
    for (const tagName of tags) {
      await pool.query('INSERT IGNORE INTO tags (name) VALUES (?)', [tagName]);
      const [[tag]] = await pool.query('SELECT id FROM tags WHERE name = ?', [tagName]);
      await pool.query(
        'INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)',
        [id, tag.id]
      );
    }
  }

  return true;
};

// ─── Admin: delete ───────────────────────────────────────────────────────────
exports.deleteArticle = async (id) => {
  await pool.query('DELETE FROM processed_articles WHERE id = ?', [id]);
  return true;
};

// ─── Workflow actions ────────────────────────────────────────────────────────
exports.approveArticle = async (id) => {
  await pool.query(
    "UPDATE processed_articles SET status = 'approved' WHERE id = ?",
    [id]
  );
};

exports.rejectArticle = async (id) => {
  await pool.query(
    "UPDATE processed_articles SET status = 'rejected' WHERE id = ?",
    [id]
  );
};

exports.publishArticle = async (id) => {
  await pool.query(
    "UPDATE processed_articles SET status = 'published', published_at = NOW() WHERE id = ?",
    [id]
  );
};

// ─── Public: latest articles ─────────────────────────────────────────────────
exports.getLatestArticles = async (limit = 10) => {
  const [rows] = await pool.query(
    `${BASE_SELECT} WHERE p.status = 'published' ORDER BY p.published_at DESC LIMIT ?`,
    [Number(limit)]
  );
  return _attachRelations(rows);
};

// ─── Public: by slug ─────────────────────────────────────────────────────────
exports.getArticleBySlug = async (slug) => {
  const [rows] = await pool.query(
    `${BASE_SELECT} WHERE p.slug = ? AND p.status = 'published'`,
    [slug]
  );
  if (!rows.length) return null;
  const [article] = await _attachRelations(rows);
  return article;
};

// ─── Public: all published ───────────────────────────────────────────────────
exports.getPublishedArticles = async () => {
  const [rows] = await pool.query(
    `${BASE_SELECT} WHERE p.status = 'published' ORDER BY p.published_at DESC`
  );
  return _attachRelations(rows);
};

// ─── Public: published by category slug ──────────────────────────────────────
exports.getPublishedByCategory = async (categorySlug) => {
  const [rows] = await pool.query(
    `${BASE_SELECT}
     WHERE p.status = 'published' AND c.slug = ?
     ORDER BY p.published_at DESC`,
    [categorySlug]
  );
  return _attachRelations(rows);
};
