import api from './api';

// ========== ARTICLE CRUD ==========

const getArticles = async () => {
    try {
        const response = await api.get('/articles');
        return {
            articles: response.data || [],
            total: response.data?.length || 0,
            pages: 1
        };
    } catch (error) {
        console.error('Failed to fetch articles from backend:', error);
        return { articles: [], total: 0, pages: 1 };
    }
};

const getArticle = async (id) => {
    try {
        const response = await api.get(`/articles/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch article:', error);
        throw error;
    }
};

const createArticle = async (data) => {
    try {
        const response = await api.post('/articles', data);
        return response.data;
    } catch (error) {
        console.error('Failed to create article:', error);
        throw error;
    }
};

const editArticle = async (id, data) => {
    const response = await api.put(`/articles/${id}`, data);
    return response.data;
};

const deleteArticle = async (id) => {
    const response = await api.delete(`/articles/${id}`);
    return response.data;
};

// ========== APPROVAL WORKFLOW ==========

const approveArticle = async (id) => {
    const response = await api.put(`/articles/${id}/approve`);
    return response.data;
};

const publishArticle = async (id) => {
    const response = await api.put(`/articles/${id}/publish`);
    return response.data;
};

// ========== SCRAPER & PROCESSOR ==========

const runScraper = async () => {
    const response = await api.post('/scrape');
    return response.data;
};

const runProcessor = async () => {
    const response = await api.post('/process');
    return response.data;
};

const getScraperStatus = async () => {
    try {
        const response = await api.get('/scrape/status');
        return response.data;
    } catch (error) {
        console.error('Failed to get scraper status:', error);
        return null;
    }
};

// ========== STATS & STATUS ==========

const checkBackendHealth = async () => {
    try {
        const response = await api.get('/');
        return { connected: true, status: response.data };
    } catch (error) {
        return { connected: false, error: error.message };
    }
};

const articleService = {
    // CRUD
    getArticles,
    getArticle,
    createArticle,
    editArticle,
    deleteArticle,
    
    // Workflow
    approveArticle,
    publishArticle,
    
    // Scraper & Processor
    runScraper,
    runProcessor,
    getScraperStatus,
    
    // Status
    checkBackendHealth
};

export default articleService;
