const { Worker } = require('bullmq');
const { connection, useMock } = require('../config/queue');
const { Article } = require('../models');
const { generateMarathiNews } = require('../services/manusService');
const { getMockQueue, MockWorker } = require('../config/mockQueue');

let worker;

const processJob = async job => {
    const { articleId, rawInput } = job.data;
    console.log(`[Worker] Job ${job.id} started for Article: ${articleId}`);

    const article = await Article.findByPk(articleId);
    if (!article) {
        throw new Error(`Article not found: ${articleId}`);
    }

    // Update status to PROCESSING
    await article.update({
        generation_status: 'PROCESSING',
        generation_started_at: new Date(),
        generation_error: null
    });

    try {
        // Call AI Service
        console.log(`[Worker] Generating content for ${articleId}...`);
        const aiData = await generateMarathiNews(rawInput);

        // Update Article with all AI-generated content
        await article.update({
            title: aiData.title || article.title,
            subtitle: aiData.subtitle || '',
            content: aiData.content_html || '',
            summary: aiData.summary || '',
            generation_status: 'COMPLETED',
            generation_completed_at: new Date()
        });

        console.log(`[Worker] Job ${job.id} COMPLETED for Article: ${articleId}`);
        return { success: true, articleId };

    } catch (error) {
        console.error(`[Worker] Job ${job.id} FAILED for Article: ${articleId}`, error);

        await article.update({
            generation_status: 'FAILED',
            generation_error: error.message,
            generation_completed_at: new Date()
        });

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
