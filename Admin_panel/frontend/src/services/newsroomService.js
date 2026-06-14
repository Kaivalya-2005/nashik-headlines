// Use the shared axios instance from api.js.
// It already reads 'token' from localStorage, attaches Authorization headers,
// and redirects to the admin login route on 401 — no duplication needed here.
import api from '../api/api';

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

export const reprocessFailed = async () => {
  try {
    const response = await api.post('/pipeline/reprocess-failed');
    return response.data;
  } catch (error) {
    console.error('Failed to reprocess skipped articles:', error);
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

export const deleteRawArticlesBatch = async (ids = [], force = false) => {
  try {
    const response = await api.post('/raw-articles/batch-delete', { ids, force });
    return response.data;
  } catch (error) {
    console.error('Failed to batch-delete raw articles:', error);
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
    const payloadImages = Array.isArray(data.images) ? data.images : [];
    const featuredImage = payloadImages.find((img) => img?.isFeatured) || payloadImages[0] || null;

    const response = await api.post('/articles', {
      ...data,
      title:                data.title,
      content:              data.content,
      summary:              data.summary || '',
      excerpt:              data.excerpt || '',
      category:             data.category || '',
      status:               data.status || 'draft',
      publish_to:           data.publish_to || 'nashik',
      language:             data.language || 'mr',
      format:               data.format || 'standard',
      sticky:               data.sticky || false,
      city:                 data.city || 'nashik',
      region:               data.region || 'maharashtra',
      author_name:          data.author_name || '',
      byline:               data.byline || '',
      focus_keyword:        data.focus_keyword || '',
      seo_title:            data.seo_title || '',
      meta_description:     data.meta_description || '',
      slug:                 data.slug || '',
      keywords:             data.keywords || '',
      tags:                 data.tags || '',
      image_alt:            data.image_alt || featuredImage?.altText || '',
      image_url:            data.image_url || featuredImage?.url || '',
      og_title:             data.og_title || '',
      og_description:       data.og_description || '',
      og_image:             data.og_image || featuredImage?.url || '',
      twitter_title:        data.twitter_title || '',
      twitter_description:  data.twitter_description || '',
      featured_image_url:   data.featured_image_url || featuredImage?.url || '',
      featured_image_alt:   data.featured_image_alt || featuredImage?.altText || '',
      canonical_url:        data.canonical_url || '',
      images:               payloadImages,
    });
    return response.data;
  } catch (error) {
    console.error('Failed to create article:', error);
    throw error;
  }
};

/**
 * Upload images directly to Navi Mumbai WordPress media — no article DB row.
 * @param {File[]} files
 * @param {object[]} metaList - optional [{ altText, caption, isFeatured }]
 */
export const uploadPublishImages = async (files, metaList = []) => {
  const formData = new FormData();
  (files || []).forEach((file) => formData.append('images', file));
  if (metaList.length) {
    formData.append('meta', JSON.stringify(metaList));
  }
  const response = await api.post('/publish/upload-images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data?.images || [];
};

/**
 * Publish article DIRECTLY to Navi Mumbai WordPress — no DB record created.
 * Used when publish_to = 'navimumbai' (Navi Mumbai only).
 */
export const publishDirectToWordPress = async (articleData) => {
  try {
    const response = await api.post('/publish/direct-to-wp', articleData);
    return response.data;
  } catch (error) {
    console.error('Failed to publish to WordPress:', error);
    throw error;
  }
};

/**
 * Publish an existing DB article with a specific target override.
 */
export const publishArticleWithTarget = async (id, publishTo) => {
  try {
    const response = await api.post(`/publish/${id}`, { publish_to: publishTo });
    return response.data;
  } catch (error) {
    console.error('Failed to publish article with target:', error);
    throw error;
  }
};

export const updateArticle = async (id, data) => {
  try {
    const response = await api.put(`/articles/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Failed to update article:', error);
    throw error;
  }
};

export const regenerateArticle = async (data) => {
  try {
    const response = await api.post('/articles/regenerate', data);
    return response.data;
  } catch (error) {
    console.error('Failed to regenerate article:', error);
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

export const deleteArticlesBatch = async (ids = [], force = false) => {
  try {
    const response = await api.post('/articles/batch-delete', { ids, force });
    return response.data;
  } catch (error) {
    console.error('Failed to batch-delete articles:', error);
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
  regenerateArticle,
  approveArticle,
  publishArticle,
  improveArticleQuality,
  deleteArticle,
  getAllRawArticles,
  getPendingRawArticles,
  getPipelineStatus,
  cancelPipeline
};
