const express = require('express');
const router = express.Router();

const articleController  = require('../controllers/articleController');
const categoryController = require('../controllers/categoryController');

// ─── IMPORTANT: specific paths BEFORE /:slug ──────────────────────────────

// GET /api/articles/latest
router.get('/articles/latest',              articleController.getLatestArticles);

// GET /api/articles/category/:slug
router.get('/articles/category/:slug',      articleController.getPublishedByCategory);

// GET /api/articles           (all published)
router.get('/articles',                     articleController.getPublishedArticles);

// GET /api/articles/:slug
router.get('/articles/:slug',               articleController.getArticleBySlug);

// GET /api/categories
router.get('/categories',                   categoryController.getAllCategories);

module.exports = router;
