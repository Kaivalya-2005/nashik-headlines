const { Worker } = require('bullmq');
const { connection, useMock } = require('../config/queue');
const Article = require('../models/Article');
const { generateMarathiNews } = require('../services/geminiService');
const { getMockQueue, MockWorker } = require('../config/mockQueue');

let worker;

const processJob = async job => {
    const { articleId, rawInput } = job.data;
    console.log(`[Worker] Job ${job.id} started for Article: ${articleId}`);

    const article = await Article.findById(articleId);
    if (!article) {
        throw new Error(`Article not found: ${articleId}`);
    }

    // Update status to PROCESSING
    article.generationStatus = 'PROCESSING';
    article.generationStartedAt = new Date();
    article.generationError = null;
    await article.save();

    try {
        // Call AI Service
        console.log(`[Worker] Generating content for ${articleId}...`);
        const aiData = await generateMarathiNews(rawInput);

        // Update Article
        article.title = aiData.title || article.title;
        article.content = aiData.content_html || '';
        article.seo = aiData.seo || {};

        if (aiData.images && Array.isArray(aiData.images)) {
            const aiImages = aiData.images.map(img => ({
                url: '',
                path: '',
                caption: img.caption,
                altText: img.alt_text,
                isFeatured: false
            }));
            article.images.push(...aiImages);
        }

        article.generationStatus = 'COMPLETED';
        article.generationCompletedAt = new Date();
        await article.save();

        console.log(`[Worker] Job ${job.id} COMPLETED for Article: ${articleId}`);
        return { success: true, articleId };

    } catch (error) {
        console.error(`[Worker] Job ${job.id} FAILED for Article: ${articleId}`, error);

        article.generationStatus = 'FAILED';
        article.generationError = error.message;
        article.generationCompletedAt = new Date();
        await article.save();

        throw error;
    }
};

// Initialize Worker based on Mode
if (useMock) {
    console.log('[Worker] Using MockWorker (In-Memory)');
    const queue = getMockQueue('ai-generation');
    worker = new MockWorker('ai-generation', processJob);
    queue.registerWorker(worker);
} else {
    // Only initialize BullMQ Worker if NOT using mock
    console.log('[Worker] Using BullMQ Worker (Redis)');
    try {
        worker = new Worker('ai-generation', processJob, {
            connection,
            concurrency: 2
        });

        worker.on('completed', job => {
            console.log(`[Worker] Job ${job.id} has completed!`);
        });

        worker.on('failed', (job, err) => {
            console.log(`[Worker] Job ${job.id} has failed with ${err.message}`);
        });
    } catch (error) {
        console.error('[Worker] Failed to initialize BullMQ Worker:', error);
    }
}

module.exports = worker;
