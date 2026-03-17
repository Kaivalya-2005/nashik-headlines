const express = require('express');
const router  = express.Router();

const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

const articleController  = require('../controllers/articleController');
const categoryController = require('../controllers/categoryController');
const tagController      = require('../controllers/tagController');

// ─── All admin routes require a valid JWT ─────────────────────────────────────
router.use(verifyToken);

// ─── Articles ─────────────────────────────────────────────────────────────────
router.get   ('/articles',              articleController.getArticles);
router.get   ('/articles/:id',          articleController.getArticleById);
router.post  ('/articles',              articleController.createArticle);
router.put   ('/articles/:id',          articleController.updateArticle);
router.delete('/articles/:id',          articleController.deleteArticle);

// ─── Workflow ─────────────────────────────────────────────────────────────────
router.post('/articles/:id/approve',    articleController.approveArticle);
router.post('/articles/:id/reject',     articleController.rejectArticle);
// Publish requires admin role
router.post('/articles/:id/publish',    authorizeRoles('admin'), articleController.publishArticle);

// ─── Image upload ─────────────────────────────────────────────────────────────
router.post('/articles/:id/images',     upload.single('image'), articleController.uploadImage);

// ─── Categories ───────────────────────────────────────────────────────────────
router.post  ('/categories',            categoryController.createCategory);
router.put   ('/categories/:id',        categoryController.updateCategory);
router.delete('/categories/:id',        categoryController.deleteCategory);

// ─── Tags ─────────────────────────────────────────────────────────────────────
router.post  ('/tags',                  tagController.createTag);
router.put   ('/tags/:id',              tagController.updateTag);
router.delete('/tags/:id',              tagController.deleteTag);

module.exports = router;
