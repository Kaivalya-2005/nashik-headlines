const express = require('express');
const router = express.Router();
const {
    getArticles,
    getArticleById,
    createArticle,
    updateArticle,
    deleteArticle,
    generateArticleContent,
    analyzeArticleSEO,
    improveArticleSEO,
    pushToWordPress,
    uploadArticleImages,
    generateImageSEO,
    getArticleStatus
} = require('../controllers/articleController');
const { protect } = require('../middleware/authMiddleware');
const { roleCheck } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

const rateLimit = require('express-rate-limit');

const generateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Increase limit for testing
    message: 'Too many AI generation requests, please try again later'
});

router.route('/')
    .get(protect, getArticles)
    .post(protect, createArticle);

router.route('/:id')
    .get(protect, getArticleById)
    .put(protect, updateArticle)
    .delete(protect, roleCheck(['ADMIN']), deleteArticle);

router.route('/:id/generate')
    .post(protect, generateLimiter, generateArticleContent);

router.route('/:id/status')
    .get(protect, getArticleStatus);

router.route('/:id/seo/analyze')
    .post(protect, analyzeArticleSEO);

router.route('/:id/seo/improve')
    .post(protect, generateLimiter, improveArticleSEO);

router.route('/:id/push-to-wp')
    .post(protect, roleCheck(['ADMIN']), pushToWordPress);

router.route('/:id/images')
    .post(protect, upload.array('images', 3), uploadArticleImages);

router.route('/:id/images/:imageId/seo')
    .post(protect, generateLimiter, generateImageSEO);

module.exports = router;
