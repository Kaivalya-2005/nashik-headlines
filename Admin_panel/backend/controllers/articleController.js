const mongoose = require('mongoose');
const Article = require('../models/Article');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { generateMarathiNews, improveSEOMetadata } = require('../services/geminiService');
const { analyzeSEO } = require('../services/seoService');
const { createDraftPost } = require('../services/wordpressService');

// @desc    Get all articles
// @route   GET /api/articles
// @access  Private
const getArticles = async (req, res) => {
    try {
        const pageSize = 10;
        const page = Number(req.query.pageNumber) || 1;

        const count = await Article.countDocuments();
        const articles = await Article.find({})
            .populate('createdBy', 'email role')
            .limit(pageSize)
            .skip(pageSize * (page - 1))
            .sort({ updatedAt: -1 });

        res.json({ articles, page, pages: Math.ceil(count / pageSize), total: count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get article by ID
// @route   GET /api/articles/:id
// @access  Private
const getArticleById = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id).populate('createdBy', 'email');

        if (article) {
            res.json(article);
        } else {
            res.status(404).json({ message: 'Article not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new article draft
// @route   POST /api/articles
// @access  Private
const createArticle = async (req, res) => {
    try {
        const { title, rawInput } = req.body;

        const article = await Article.create({
            title,
            rawInput,
            createdBy: req.user._id,
            status: 'DRAFT_LOCAL'
        });

        res.status(201).json(article);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update an article
// @route   PUT /api/articles/:id
// @access  Private
const updateArticle = async (req, res) => {
    try {
        const { title, rawInput, content, status } = req.body;

        const article = await Article.findById(req.params.id);

        if (article) {
            article.title = title || article.title;
            article.rawInput = rawInput || article.rawInput;
            article.content = content || article.content;
            article.status = status || article.status;
            article.updatedBy = req.user._id;

            const updatedArticle = await article.save();
            res.json(updatedArticle);
        } else {
            res.status(404).json({ message: 'Article not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete an article
// @route   DELETE /api/articles/:id
// @access  Private/Admin
const deleteArticle = async (req, res) => {
    try {
        // Check role in middleware, but double check here if needed or just rely on middleware
        // Implementation uses findByIdAndDelete for simplicity but strictly we should check existence first
        const article = await Article.findById(req.params.id);

        if (article) {
            await article.deleteOne();
            res.json({ message: 'Article removed' });
        } else {
            res.status(404).json({ message: 'Article not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const { aiQueue } = require('../config/queue');

// @desc    Generate article content using AI (Async Job)
// @route   POST /api/articles/:id/generate
// @access  Private
const generateArticleContent = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        if (!article.rawInput) {
            return res.status(400).json({ message: 'Raw input is required for generation' });
        }

        // Add Job to Queue
        const job = await aiQueue.add('generate-news', {
            articleId: article._id,
            rawInput: article.rawInput
        });

        // Update Article Status
        article.generationStatus = 'PENDING';
        article.generationError = null;
        article.generationStartedAt = null;
        article.generationCompletedAt = null;
        await article.save();

        res.status(202).json({
            message: 'AI generation job queued',
            jobId: job.id,
            status: 'PENDING',
            articleId: article._id
        });

    } catch (error) {
        console.error('Queue Error:', error);
        res.status(500).json({ message: 'Failed to queue AI job: ' + error.message });
    }
};

// @desc    Get AI Generation Status
// @route   GET /api/articles/:id/status
// @access  Private
const getArticleStatus = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id).select('generationStatus generationError generationStartedAt generationCompletedAt');
        if (!article) return res.status(404).json({ message: 'Article not found' });
        res.json(article);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Analyze Article SEO
// @route   POST /api/articles/:id/seo/analyze
// @access  Private
const analyzeArticleSEO = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) return res.status(404).json({ message: 'Article not found' });

        const analysis = analyzeSEO(article);

        article.seo.seoScore = analysis.score;
        article.seo.seoReport = analysis.report;

        await article.save();
        res.json(article.seo);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Improve Article SEO Metadata using AI
// @route   POST /api/articles/:id/seo/improve
// @access  Private
const improveArticleSEO = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) return res.status(404).json({ message: 'Article not found' });

        // Call AI to generate better metadata
        const improvedMetadata = await improveSEOMetadata(article);

        // Update Article SEO fields
        article.seo.meta_title = improvedMetadata.meta_title;
        article.seo.meta_description = improvedMetadata.meta_description;
        article.seo.focus_keywords = improvedMetadata.focus_keywords;

        // Re-analyze after improvement
        const analysis = analyzeSEO(article);
        article.seo.seoScore = analysis.score;
        article.seo.seoReport = analysis.report;

        await article.save();
        res.json(article.seo);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Push Article to WordPress as Draft
// @route   POST /api/articles/:id/push-to-wp
// @access  Private/Admin
const pushToWordPress = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) return res.status(404).json({ message: 'Article not found' });

        // Check if already published/pushed
        if (article.wpId && article.status === 'PUBLISHED') {
            return res.status(400).json({ message: 'Article is already published on WordPress.' });
        }

        // Call WP Service
        const wpData = await createDraftPost(article);

        // Update Article with WP data
        article.wpId = wpData.wpId;
        article.wpUrl = wpData.wpUrl; // Draft preview URL
        article.status = 'DRAFT_WP';

        await article.save();

        res.json({
            message: 'Article pushed to WordPress successfully',
            wpId: article.wpId,
            wpUrl: article.wpUrl
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Exports moved to bottom

// @desc    Upload images to article
// @route   POST /api/articles/:id/images
// @access  Private
const uploadArticleImages = async (req, res) => {
    try {
        console.log(`[Upload] Starting upload for Article ID: ${req.params.id}`);

        // 1. Validate Article ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            console.warn(`[Upload] Invalid Article ID format: ${req.params.id}`);
            return res.status(400).json({ message: 'Invalid article ID format' });
        }

        // 2. Check if files exist
        if (!req.files || req.files.length === 0) {
            console.warn('[Upload] No files provided in request');
            try {
                fs.appendFileSync(path.join(__dirname, '../debug_upload_error.txt'), new Date().toISOString() + ' [CONTROLLER 400] - No files provided (req.files: ' + JSON.stringify(req.files) + ', req.body: ' + JSON.stringify(req.body) + ')\n');
            } catch (e) { }
            return res.status(400).json({ message: 'No images uploaded. Please select at least one image.' });
        }

        console.log(`[Upload] Processing ${req.files.length} files...`);

        // 3. Find Article
        const article = await Article.findById(req.params.id);
        if (!article) {
            console.warn(`[Upload] Article not found: ${req.params.id}`);
            // Clean up uploaded files if article doesn't exist (optional but good practice)
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            });
            return res.status(404).json({ message: 'Article not found' });
        }

        // 4. Process and Optimize Images
        const processedImages = [];

        for (const file of req.files) {
            try {
                const start = Date.now();
                const optimizedFilename = `${path.parse(file.filename).name}-optimized.webp`;
                const optimizedPath = path.join(file.destination, optimizedFilename);
                const optimizedUrl = `/uploads/${optimizedFilename}`;

                // Sharp Processing
                const metadata = await sharp(file.path).metadata();
                console.log(`[Upload] Optimizing ${file.filename} (${metadata.width}x${metadata.height})`);

                await sharp(file.path)
                    .resize({ width: 1600, withoutEnlargement: true }) // Max width 1600px
                    .toFormat('webp', { quality: 75 }) // Convert to WebP
                    .toFile(optimizedPath);

                const end = Date.now();
                console.log(`[Upload] Optimized ${file.filename} -> ${optimizedFilename} in ${end - start}ms`);

                // Get new file size
                const stats = fs.statSync(optimizedPath);

                // Delete original file
                fs.unlinkSync(file.path);

                processedImages.push({
                    url: optimizedUrl,
                    path: optimizedPath,
                    filename: optimizedFilename,
                    size: stats.size,
                    mimetype: 'image/webp',
                    caption: '',
                    altText: '',
                    isFeatured: false
                });

            } catch (processError) {
                console.error(`[Upload] Failed to process file ${file.filename}:`, processError);
                try {
                    fs.appendFileSync(path.join(__dirname, '../debug_upload_error.txt'), new Date().toISOString() + ' - SHARP ERROR: ' + processError.message + '\n' + processError.stack + '\n');
                } catch (e) { }
                throw new Error(`Failed to optimize image: ${file.originalname}`);
            }
        }

        // 5. Add to Article
        article.images.push(...processedImages);

        // Set featured image if none exists or if this is the first batch
        if (article.images.length === processedImages.length) {
            article.images[0].isFeatured = true;
        }

        await article.save();

        console.log(`[Upload] Success! Added ${processedImages.length} optimized images to Article ${article._id}`);
        res.status(200).json(article.images);

    } catch (error) {
        console.error('[Upload] Critical Error:', error);

        try {
            fs.appendFileSync(path.join(__dirname, '../debug_upload_error.txt'), new Date().toISOString() + ' - ' + error.message + '\n' + error.stack + '\n');
        } catch (fileErr) {
            console.error('Failed to write debug log:', fileErr);
        }

        // Log stack for debugging but don't expose to user in production
        const stack = process.env.NODE_ENV === 'production' ? null : error.stack;

        res.status(500).json({
            message: 'Server failed to process images',
            error: error.message,
            stack
        });
    }
};

// @desc    Generate SEO for a specific image
// @route   POST /api/articles/:id/images/:imageId/seo
// @access  Private
const generateImageSEO = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) return res.status(404).json({ message: 'Article not found' });

        const image = article.images.id(req.params.imageId);
        if (!image) return res.status(404).json({ message: 'Image not found' });

        // Call AI Service
        // Use article title/content as context
        const context = article.title + ' ' + (article.content || article.rawInput).substring(0, 100);
        const { generateImageMetaData } = require('../services/geminiService'); // Lazy load to avoid circular if any

        const metadata = await generateImageMetaData(image.path, context);

        image.caption = metadata.caption;
        image.altText = metadata.alt_text;

        await article.save();
        res.json(image);

    } catch (error) {
        console.error("Image SEO Error:", error);
        res.status(500).json({ message: 'Failed to generate image SEO' });
    }
};

module.exports = {
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
};
