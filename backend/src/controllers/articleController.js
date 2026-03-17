const articleService = require('../services/articleService');

// ─── Admin ────────────────────────────────────────────────────────────────────

exports.getArticles = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await articleService.getArticles(page, limit);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

exports.getArticleById = async (req, res, next) => {
  try {
    const article = await articleService.getArticleById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    res.json({ success: true, data: article });
  } catch (err) { next(err); }
};

exports.createArticle = async (req, res, next) => {
  try {
    const articleId = await articleService.createArticle(req.body);
    res.status(201).json({ success: true, message: 'Article created', articleId });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 400;
    next(err);
  }
};

exports.updateArticle = async (req, res, next) => {
  try {
    await articleService.updateArticle(req.params.id, req.body);
    res.json({ success: true, message: 'Article updated' });
  } catch (err) { next(err); }
};

exports.deleteArticle = async (req, res, next) => {
  try {
    await articleService.deleteArticle(req.params.id);
    res.json({ success: true, message: 'Article deleted' });
  } catch (err) { next(err); }
};

// ─── Workflow ─────────────────────────────────────────────────────────────────

exports.approveArticle = async (req, res, next) => {
  try {
    await articleService.approveArticle(req.params.id);
    res.json({ success: true, message: 'Article approved' });
  } catch (err) { next(err); }
};

exports.rejectArticle = async (req, res, next) => {
  try {
    await articleService.rejectArticle(req.params.id);
    res.json({ success: true, message: 'Article rejected' });
  } catch (err) { next(err); }
};

exports.publishArticle = async (req, res, next) => {
  try {
    await articleService.publishArticle(req.params.id);
    res.json({ success: true, message: 'Article published' });
  } catch (err) { next(err); }
};

// ─── Public ───────────────────────────────────────────────────────────────────

exports.getPublishedArticles = async (req, res, next) => {
  try {
    const articles = await articleService.getPublishedArticles();
    res.json({ success: true, data: articles });
  } catch (err) { next(err); }
};

exports.getLatestArticles = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const articles = await articleService.getLatestArticles(limit);
    res.json({ success: true, data: articles });
  } catch (err) { next(err); }
};

exports.getArticleBySlug = async (req, res, next) => {
  try {
    const article = await articleService.getArticleBySlug(req.params.slug);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    res.json({ success: true, data: article });
  } catch (err) { next(err); }
};

exports.getPublishedByCategory = async (req, res, next) => {
  try {
    const articles = await articleService.getPublishedByCategory(req.params.slug);
    res.json({ success: true, data: articles });
  } catch (err) { next(err); }
};

// ─── Image Upload (Sharp → WebP) ──────────────────────────────────────────────
const sharp  = require('sharp');
const path   = require('path');
const fs     = require('fs');
const pool   = require('../config/db');

exports.uploadImage = async (req, res, next) => {
  try {
    const articleId = req.params.id;
    if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided.' });

    const { caption = '', alt_text = '', position = 0 } = req.body;

    const uploadDir = path.join(__dirname, '../../uploads/articles', String(articleId));
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    const filepath = path.join(uploadDir, filename);

    await sharp(req.file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filepath);

    const imageUrl = `/uploads/articles/${articleId}/${filename}`;

    const [result] = await pool.query(
      'INSERT INTO article_images (article_id, image_url, alt_text, caption, position) VALUES (?, ?, ?, ?, ?)',
      [articleId, imageUrl, alt_text, caption, position]
    );

    res.status(200).json({ success: true, message: 'Image uploaded', data: { id: result.insertId, imageUrl } });
  } catch (err) { next(err); }
};
