// =========================================
// ARTICLE CONTROLLER - SEQUELIZE VERSION
// Works with unified MySQL database
// =========================================

const {
    Article,
    RawArticle,
    User,
    Image,
    Category,
    Tag,
    AgentLog,
    sequelize
} = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { generateMarathiNews, improveSEOMetadata } = require('../services/manusService');
const { analyzeSEO } = require('../services/seoService');
const { createDraftPost } = require('../services/wordpressService');

// ===== GET ALL ARTICLES =====
exports.getArticles = async (req, res) => {
    try {
        const pageSize = parseInt(req.query.pageSize) || 10;
        const page = parseInt(req.query.page) || 1;
        const status = req.query.status || null;

        const where = {};
        if (status) where.status = status;

        const { count, rows } = await Article.findAndCountAll({
            where,
            include: [
                { model: User, as: 'createdByUser', attributes: ['id', 'name', 'email'] },
                { model: Image, as: 'images' }
            ],
            order: [['updated_at', 'DESC']],
            limit: pageSize,
            offset: (page - 1) * pageSize
        });

        res.status(200).json({
            articles: rows,
            page,
            pageSize,
            total: count,
            pages: Math.ceil(count / pageSize)
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ===== GET ARTICLE BY ID =====
exports.getArticleById = async (req, res) => {
    try {
        const article = await Article.findByPk(req.params.id, {
            include: [
                { model: User, as: 'createdByUser', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'updatedByUser', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'approvedByUser', attributes: ['id', 'name', 'email'] },
                { model: Image, as: 'images' },
                { model: Category, as: 'categories', through: { attributes: [] } },
                { model: Tag, as: 'tags', through: { attributes: [] } },
                { model: RawArticle, as: 'rawArticle' }
            ]
        });

        if (article) {
            res.status(200).json(article);
        } else {
            res.status(404).json({ message: 'Article not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ===== CREATE NEW ARTICLE =====
exports.createArticle = async (req, res) => {
    try {
        const { title, subtitle, rawInput, content } = req.body;

        const article = await Article.create({
            title,
            subtitle,
            rawInput,
            content,
            created_by: req.user.id,
            status: 'DRAFT_EDITED'
        });

        res.status(201).json({
            message: 'Article created successfully',
            article
        });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// ===== UPDATE ARTICLE =====
exports.updateArticle = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            subtitle,
            content,
            summary,
            focus_keyphrase,
            quote_block,
            source_name,
            source_url,
            via_name,
            via_url,
            seo_title,
            seo_description,
            seo_slug,
            seo_keywords,
            tags,
            status
        } = req.body;

        const article = await Article.findByPk(id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // Update basic fields
        const updateData = {
            title: title || article.title,
            subtitle: subtitle || article.subtitle,
            content: content || article.content,
            summary: summary || article.summary,
            focus_keyphrase: focus_keyphrase || article.focus_keyphrase,
            quote_block: quote_block || article.quote_block,
            source_name: source_name || article.source_name,
            source_url: source_url || article.source_url,
            via_name: via_name || article.via_name,
            via_url: via_url || article.via_url,
            seo_title: seo_title || article.seo_title,
            seo_description: seo_description || article.seo_description,
            seo_slug: seo_slug || article.seo_slug,
            seo_keywords: seo_keywords || article.seo_keywords,
            updated_by: req.user.id
        };

        // Update status if provided and user has permission
        if (status && req.user.role === 'ADMIN') {
            updateData.status = status;
        }

        await article.update(updateData);

        // Update tags if provided
        if (tags && tags.length > 0) {
            // Find or create tags and associate them
            const tagInstances = await Promise.all(tags.map(async (tagName) => {
                const [tag] = await Tag.findOrCreate({
                    where: { name: tagName },
                    defaults: { slug: tagName.toLowerCase().replace(/\s+/g, '-') }
                });
                return tag;
            }));

            await article.setTags(tagInstances);
        }

        // Fetch updated article with associations
        const updatedArticle = await Article.findByPk(id, {
            include: [
                { model: Image, as: 'images' },
                { model: Tag, as: 'tags', through: { attributes: [] } }
            ]
        });

        res.status(200).json({
            message: 'Article updated successfully',
            article: updatedArticle
        });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// ===== DELETE ARTICLE =====
exports.deleteArticle = async (req, res) => {
    try {
        const { id } = req.params;

        const article = await Article.findByPk(id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // Delete associated images
        await Image.destroy({ where: { article_id: id } });

        // Delete article
        await article.destroy();

        res.status(200).json({
            message: 'Article deleted successfully'
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ===== GENERATE ARTICLE CONTENT (AI) =====
exports.generateArticleContent = async (req, res) => {
    try {
        const { id } = req.params;

        const article = await Article.findByPk(id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // Update status to PROCESSING
        await article.update({
            generation_status: 'PROCESSING',
            generation_started_at: new Date()
        });

        try {
            // Call manus_agents to generate content
            const generatedContent = await generateMarathiNews(article.rawInput || article.title);

            // Update article with generated content
            await article.update({
                title: generatedContent.title,
                subtitle: generatedContent.subtitle,
                content: generatedContent.content_html,
                summary: generatedContent.summary,
                focus_keyphrase: generatedContent.focus_keyphrase,
                seo_title: generatedContent.seo.meta_title,
                seo_description: generatedContent.seo.meta_description,
                seo_slug: generatedContent.seo.slug,
                seo_keywords: generatedContent.seo.focus_keywords,
                quote_block: generatedContent.quote_block,
                source_name: generatedContent.source_name,
                source_url: generatedContent.source_url,
                via_name: generatedContent.via_name,
                via_url: generatedContent.via_url,
                status: 'DRAFT_EDITED',
                generation_status: 'COMPLETED',
                generation_completed_at: new Date()
            });

            // Handle tags
            if (generatedContent.tags && generatedContent.tags.length > 0) {
                const tagInstances = await Promise.all(generatedContent.tags.map(async (tagName) => {
                    const [tag] = await Tag.findOrCreate({
                        where: { name: tagName },
                        defaults: { slug: tagName.toLowerCase().replace(/\s+/g, '-') }
                    });
                    return tag;
                }));
                await article.setTags(tagInstances);
            }

            // Fetch updated article
            const updatedArticle = await Article.findByPk(id, {
                include: [{ model: Tag, as: 'tags', through: { attributes: [] } }]
            });

            res.status(200).json({
                message: 'Content generated successfully',
                article: updatedArticle
            });

        } catch (aiError) {
            // Log error
            await article.update({
                generation_status: 'FAILED',
                generation_error: aiError.message,
                generation_completed_at: new Date()
            });

            res.status(500).json({
                message: 'AI Generation failed',
                error: aiError.message
            });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ===== ANALYZE ARTICLE SEO =====
exports.analyzeArticleSEO = async (req, res) => {
    try {
        const { id } = req.params;

        const article = await Article.findByPk(id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // Analyze SEO
        const seoReport = await analyzeSEO({
            title: article.seo_title,
            description: article.seo_description,
            slug: article.seo_slug,
            keywords: article.seo_keywords,
            content: article.content
        });

        res.status(200).json({
            seoReport,
            seoScore: seoReport.score || 0
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ===== IMPROVE ARTICLE SEO (AI) =====
exports.improveArticleSEO = async (req, res) => {
    try {
        const { id } = req.params;

        const article = await Article.findByPk(id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        try {
            // Call manus_agents to improve SEO
            const improvedSEO = await improveSEOMetadata({
                title: article.title,
                content: article.content,
                keywords: article.seo_keywords
            });

            // Update article with improved SEO
            await article.update({
                seo_title: improvedSEO.meta_title,
                seo_description: improvedSEO.meta_description,
                seo_keywords: improvedSEO.focus_keywords,
                seo_slug: improvedSEO.slug
            });

            res.status(200).json({
                message: 'SEO improved successfully',
                seo: {
                    title: improvedSEO.meta_title,
                    description: improvedSEO.meta_description,
                    keywords: improvedSEO.focus_keywords,
                    slug: improvedSEO.slug
                }
            });

        } catch (aiError) {
            res.status(500).json({
                message: 'SEO improvement failed',
                error: aiError.message
            });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ===== UPLOAD ARTICLE IMAGES =====
exports.uploadArticleImages = async (req, res) => {
    try {
        const { id } = req.params;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const article = await Article.findByPk(id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        const uploadedImages = [];

        for (const file of files) {
            try {
                // Optimize image with Sharp
                const optimizedPath = path.join(
                    __dirname,
                    `../uploads/${Date.now()}_optimized.webp`
                );

                await sharp(file.path).webp({ quality: 80 }).toFile(optimizedPath);

                // Create image record
                const image = await Image.create({
                    article_id: id,
                    filename: file.originalname,
                    url: `/uploads/${path.basename(optimizedPath)}`,
                    local_path: optimizedPath,
                    mime_type: file.mimetype,
                    file_size: file.size,
                    type: req.body.type || 'feature',
                    generation_method: 'UPLOAD'
                });

                uploadedImages.push(image);
            } catch (imgError) {
                console.error('Image optimization error:', imgError);
            }
        }

        res.status(201).json({
            message: 'Images uploaded successfully',
            images: uploadedImages
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ===== GENERATE IMAGE SEO =====
exports.generateImageSEO = async (req, res) => {
    try {
        const { id, imageId } = req.params;
        const { alt_text_marathi, alt_text_english, caption_marathi, caption_english } = req.body;

        const image = await Image.findByPk(imageId);

        if (!image) {
            return res.status(404).json({ message: 'Image not found' });
        }

        await image.update({
            alt_text_marathi,
            alt_text_english,
            caption_marathi,
            caption_english
        });

        res.status(200).json({
            message: 'Image SEO updated successfully',
            image
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ===== PUSH TO WORDPRESS =====
exports.pushToWordPress = async (req, res) => {
    try {
        const { id } = req.params;

        const article = await Article.findByPk(id, {
            include: [{ model: Image, as: 'images' }]
        });

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        try {
            // Create draft post on WordPress
            const wpResponse = await createDraftPost(article);

            // Update article with WordPress ID
            await article.update({
                wp_id: wpResponse.id,
                wp_url: wpResponse.link,
                status: 'DRAFT_WP'
            });

            res.status(200).json({
                message: 'Article pushed to WordPress as draft',
                wp_id: wpResponse.id,
                wp_link: wpResponse.link
            });

        } catch (wpError) {
            res.status(500).json({
                message: 'Failed to push to WordPress',
                error: wpError.message
            });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ===== GET ARTICLE STATUS =====
exports.getArticleStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const article = await Article.findByPk(id, {
            attributes: ['id', 'status', 'generation_status', 'generation_error', 'generation_started_at', 'generation_completed_at']
        });

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        res.status(200).json(article);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
