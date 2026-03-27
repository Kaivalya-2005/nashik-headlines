import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 150000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================
// SYSTEM HEALTH & MONITORING
// ============================================

export const checkBackendHealth = async () => {
  try {
    const response = await api.get('/health');
    return { connected: true, data: response.data };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

export const getSystemStats = async () => {
  try {
    const response = await api.get('/stats');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    throw error;
  }
};

// ============================================
// SCRAPING OPERATIONS
// ============================================

export const runScraper = async () => {
  try {
    const response = await api.post('/scrape');
    return response.data;
  } catch (error) {
    console.error('Scraper error:', error);
    throw error;
  }
};

export const getScraperStatus = async () => {
  try {
    const response = await api.get('/scrape/status');
    return response.data;
  } catch (error) {
    console.error('Failed to get scraper status:', error);
    return null;
  }
};

export const toggleScraper = async (enabled) => {
  try {
    const response = await api.post('/scrape/toggle', { enabled });
    return response.data;
  } catch (error) {
    console.error('Failed to toggle scraper:', error);
    throw error;
  }
};

// ============================================
// AI PROCESSING OPERATIONS
// ============================================

export const processAllPending = async () => {
  try {
    const response = await api.post('/pipeline/process-pending');
    return response.data;
  } catch (error) {
    console.error('Processing error:', error);
    throw error;
  }
};

export const getPipelineStatus = async () => {
  try {
    const response = await api.get('/pipeline/status');
    return response.data;
  } catch (error) {
    console.error('Failed to get pipeline status:', error);
    return null;
  }
};

export const cancelPipeline = async () => {
  try {
    const response = await api.post('/pipeline/cancel');
    return response.data;
  } catch (error) {
    console.error('Failed to cancel pipeline:', error);
    throw error;
  }
};

export const processSingleArticle = async (id) => {
  try {
    const response = await api.post(`/pipeline/process/${id}`);
    return response.data;
  } catch (error) {
    console.error('Single process error:', error);
    throw error;
  }
};

export const deleteRawArticle = async (id) => {
  try {
    const response = await api.delete(`/raw-articles/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete raw article:', error);
    throw error;
  }
};

// ============================================
// FULL CYCLE OPERATION (Scrape + Process)
// ============================================

export const runFullCycle = async () => {
  try {
    // First scrape
    await runScraper();
    // Then process
    const processResult = await processAllPending();
    return processResult;
  } catch (error) {
    console.error('Full cycle error:', error);
    throw error;
  }
};

// ============================================
// ARTICLE MANAGEMENT (PROCESSED)
// ============================================

export const getAllArticles = async () => {
  try {
    const response = await api.get('/articles');
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    throw error;
  }
};

export const getArticleById = async (id) => {
  try {
    const response = await api.get(`/articles/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch article:', error);
    throw error;
  }
};

export const getPublishedArticles = async () => {
  try {
    const response = await api.get('/articles/published');
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch published articles:', error);
    throw error;
  }
};

export const createArticle = async (data) => {
  try {
    const response = await api.post('/articles', {
      ...data,
      title: data.title,
      content: data.content,
      summary: data.summary || '',
      category: data.category || '',
      status: data.status || 'draft',
      seo_title: data.seo_title || '',
      meta_description: data.meta_description || '',
      slug: data.slug || '',
      keywords: data.keywords || '',
      image_alt: data.image_alt || ''
    });
    return response.data;
  } catch (error) {
    console.error('Failed to create article:', error);
    throw error;
  }
};

export const updateArticle = async (id, data) => {
  try {
    const response = await api.put(`/articles/${id}`, {
      title: data.title,
      content: data.content,
      summary: data.summary || '',
      category: data.category || ''
    });
    return response.data;
  } catch (error) {
    console.error('Failed to update article:', error);
    throw error;
  }
};

export const approveArticle = async (id) => {
  try {
    const response = await api.put(`/articles/${id}/approve`);
    return response.data;
  } catch (error) {
    console.error('Failed to approve article:', error);
    throw error;
  }
};

export const publishArticle = async (id) => {
  try {
    const response = await api.put(`/articles/${id}/publish`);
    return response.data;
  } catch (error) {
    console.error('Failed to publish article:', error);
    throw error;
  }
};

export const improveArticleQuality = async (id) => {
  try {
    const response = await api.post(`/articles/${id}/improve`);
    return response.data;
  } catch (error) {
    console.error('Failed to improve article quality:', error);
    throw error;
  }
};

export const deleteArticle = async (id) => {
  try {
    const response = await api.delete(`/articles/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete article:', error);
    throw error;
  }
};

// ============================================
// RAW ARTICLES (SCRAPED, UNPROCESSED)
// ============================================

export const getAllRawArticles = async () => {
  try {
    const response = await api.get('/raw-articles');
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch raw articles:', error);
    throw error;
  }
};

export const getPendingRawArticles = async () => {
  try {
    const response = await api.get('/raw-articles/pending');
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch pending raw articles:', error);
    throw error;
  }
};

export default {
  checkBackendHealth,
  getSystemStats,
  runScraper,
  getScraperStatus,
  toggleScraper,
  processAllPending,
  processSingleArticle,
  deleteRawArticle,
  runFullCycle,
  getAllArticles,
  getArticleById,
  getPublishedArticles,
  createArticle,
  updateArticle,
  approveArticle,
  publishArticle,
  improveArticleQuality,
  deleteArticle,
  getAllRawArticles,
  getPendingRawArticles,
  getPipelineStatus,
  cancelPipeline
};
