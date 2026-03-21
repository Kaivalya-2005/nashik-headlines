import axios from 'axios';

// Main admin API client
import api from './api';

// Manus AI API client (separate base URL for AI services)
const manusApi = axios.create({
    baseURL: import.meta.env.VITE_MANUS_API || 'http://localhost:8002',
    timeout: 60000,
});

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY AGENT CONTROL (Keep for compatibility)
// ═══════════════════════════════════════════════════════════════════════════

const startScraping = async () => {
    const response = await api.post('/agents/start-scraping');
    return response.data;
};

const stopScraping = async () => {
    const response = await api.post('/agents/stop-scraping');
    return response.data;
};

const pause = async () => {
    const response = await api.post('/agents/pause');
    return response.data;
};

const resume = async () => {
    const response = await api.post('/agents/resume');
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// MANUS AI - HEALTH & STATUS
// ═══════════════════════════════════════════════════════════════════════════

const getHealthStatus = async () => {
    const response = await manusApi.get('/health');
    return response.data;
};

const getAiStatus = async () => {
    const response = await manusApi.get('/ai/status');
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// MANUS AI - TEXT PROCESSING & REWRITING
// ═══════════════════════════════════════════════════════════════════════════

const rewriteText = async (text, title = '') => {
    const response = await manusApi.post('/ai/rewrite', {
        text,
        title
    });
    return response.data;
};

const generateSummary = async (text, title = '') => {
    const response = await manusApi.post('/ai/summary', {
        text,
        title
    });
    return response.data;
};

const generateSeoMetadata = async (text, title = '') => {
    const response = await manusApi.post('/ai/seo', {
        text,
        title
    });
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// MANUS AI - ARTICLE PROCESSING (CORE FEATURES)
// ═══════════════════════════════════════════════════════════════════════════

const processText = async (content, title = '') => {
    /**
     * Process manual/pasted article content through full AI pipeline.
     * Returns: rewritten_body, summary, SEO metadata, category, db_id, etc.
     */
    const response = await manusApi.post('/ai/process-text', {
        content,
        title
    });
    return response.data;
};

const processUrl = async (url, title = '', sourceId = null) => {
    /**
     * Process article from URL through full pipeline.
     * Returns: complete merged AI output (rewrite + summary + SEO in one response)
     */
    const response = await manusApi.post('/ai/process-url', {
        url,
        title,
        source_id: sourceId
    });
    return response.data;
};

const generateArticle = async (text, title = '') => {
    /**
     * Generate full article from topic/text.
     * Full pipeline: Editor → SEO → Publisher
     */
    const response = await manusApi.post('/ai/generate-article', {
        text,
        title
    });
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// MANUS AI - ARTICLE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

const getArticles = async (limit = 20, categoryId = null, status = null) => {
    const response = await manusApi.get('/ai/articles', {
        params: { limit, category_id: categoryId, status }
    });
    return response.data;
};

const approveArticle = async (articleId) => {
    const response = await manusApi.post(`/ai/articles/${articleId}/approve`);
    return response.data;
};

const rejectProcessedArticle = async (articleId) => {
    const response = await manusApi.post(`/ai/articles/${articleId}/reject`);
    return response.data;
};

const regenerateArticle = async (articleId) => {
    const response = await manusApi.post(`/ai/articles/${articleId}/regenerate`);
    return response.data;
};

const restoreArticle = async (articleId, payload) => {
    const response = await manusApi.post(`/ai/articles/${articleId}/restore`, payload);
    return response.data;
};

const getMemorySnapshot = async () => {
    /**
     * Get task logs and error history
     */
    const response = await manusApi.get('/ai/memory');
    return response.data;
};

// Legacy compatibility
const rejectArticle = async (id) => {
    const response = await api.post(`/agents/articles/${id}/reject`);
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// MANUS ADMIN - RUNTIME CONTROLS
// ═══════════════════════════════════════════════════════════════════════════

const getRuntimeConfig = async () => {
    /**
     * Get current feature flags
     * Returns: { web_scraper_enabled, image_generation_enabled }
     */
    const response = await manusApi.get('/admin/runtime');
    return response.data;
};

const toggleWebScraper = async (enabled) => {
    /**
     * Toggle web scraper on/off at runtime
     */
    const response = await manusApi.post('/admin/runtime/web-scraper', {
        enabled: Boolean(enabled)
    });
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// MANUS ADMIN - MANUAL PIPELINE EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

const runScraperNow = async () => {
    /**
     * Manually trigger scraper immediately
     */
    const response = await manusApi.post('/admin/actions/run-scraper');
    return response.data;
};

const runPendingQueue = async (limit = 10) => {
    /**
     * Process pending articles without scraping
     */
    const response = await manusApi.post('/admin/actions/run-pending', {
        limit: Math.min(Math.max(limit, 1), 100)
    });
    return response.data;
};

const runFullCycle = async (limit = 10, includeScraper = null) => {
    /**
     * Run complete cycle: scrape (optional) → process pending
     */
    const response = await manusApi.post('/admin/actions/run-cycle', {
        limit: Math.min(Math.max(limit, 1), 100),
        include_scraper: includeScraper
    });
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// MANUS ADMIN - MONITORING & STATS
// ═══════════════════════════════════════════════════════════════════════════

const getStats = async () => {
    /**
     * Get pipeline statistics for dashboard
     * Returns:
     *   - raw_total, raw_pending, raw_processed, raw_rejected
     *   - articles_total, articles_draft, articles_published, articles_rejected
     *   - sources
     */
    const response = await manusApi.get('/admin/stats');
    return response.data;
};

const getQueue = async (limit = 20) => {
    /**
     * Get pending queue with item count
     * Returns: pending_count, pending_items[]
     */
    const response = await manusApi.get('/admin/queue', {
        params: { limit: Math.min(Math.max(limit, 1), 100) }
    });
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY STATUS & MONITORING (Keep for compatibility)
// ═══════════════════════════════════════════════════════════════════════════

const getStatus = async () => {
    const response = await api.get('/agents/status');
    return response.data;
};

const getLogs = async (limit = 50, offset = 0) => {
    const response = await api.get('/agents/logs', {
        params: { limit, offset }
    });
    return response.data;
};

const getExecutionHistory = async (limit = 20, offset = 0) => {
    const response = await api.get('/agents/execution-history', {
        params: { limit, offset }
    });
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY DRAFT REVIEW (Keep for compatibility)
// ═══════════════════════════════════════════════════════════════════════════

const getDraftArticles = async (limit = 20, offset = 0) => {
    const response = await api.get('/agents/draft-articles', {
        params: { limit, offset }
    });
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const configure = async (config) => {
    const response = await api.post('/agents/configure', config);
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT ALL METHODS
// ═══════════════════════════════════════════════════════════════════════════

const agentService = {
    // Legacy methods (for backward compatibility)
    startScraping,
    stopScraping,
    pause,
    resume,
    getStatus,
    getLogs,
    getExecutionHistory,
    getDraftArticles,
    rejectArticle,
    configure,

    // Health & Status
    getHealthStatus,
    getAiStatus,

    // Text Processing
    rewriteText,
    generateSummary,
    generateSeoMetadata,

    // Core AI Article Processing
    processText,           // NEW: Manual content (paste & process)
    processUrl,            // Enhanced: Complete merged output
    generateArticle,       // Full pipeline generation

    // Article Management
    getArticles,
    approveArticle,
    rejectProcessedArticle,
    regenerateArticle,
    restoreArticle,
    getMemorySnapshot,

    // Admin Runtime Controls
    getRuntimeConfig,
    toggleWebScraper,

    // Admin Actions
    runScraperNow,
    runPendingQueue,
    runFullCycle,

    // Admin Monitoring
    getStats,
    getQueue,
};

export default agentService;
