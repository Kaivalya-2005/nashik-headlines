// ============================================
// DASHBOARD INTEGRATION - BACKEND API CALLS
// ============================================
// 
// Add these methods to your Dashboard component
// to integrate with the Node.js backend APIs

import articleService from '../api/articleService';
import toast from 'react-hot-toast';

// ========== STATS FETCHING ==========

export const fetchBackendStats = async () => {
  try {
    // Fetch all articles to calculate stats
    const response = await articleService.getArticles();
    const articles = response.articles || [];

    const stats = {
      total: articles.length,
      draft: articles.filter(a => String(a.status).toLowerCase() === 'draft').length,
      approved: articles.filter(a => String(a.status).toLowerCase() === 'approved').length,
      published: articles.filter(a => String(a.status).toLowerCase() === 'published').length,
      pending: articles.filter(a => String(a.status).toLowerCase() === 'draft').length,
    };

    return stats;
  } catch (error) {
    console.error('Failed to fetch backend stats:', error);
    return null;
  }
};

// ========== BACKEND HEALTH CHECK ==========

export const checkBackendHealth = async () => {
  try {
    const health = await articleService.checkBackendHealth();
    return {
      connected: health.connected,
      llm: health.connected ? 'healthy' : 'down',
      db: health.connected ? 'healthy' : 'down',
      backend: health.connected
    };
  } catch {
    return {
      connected: false,
      llm: 'down',
      db: 'down',
      backend: false
    };
  }
};

// ========== SCRAPER & PROCESSOR ACTIONS ==========

export const handleRunScraper = async (setActionLoading) => {
  try {
    setActionLoading(prev => ({ ...prev, scraper: true }));
    const result = await articleService.runScraper();
    toast.success('Scraper started! Check articles in a moment.');
    return result;
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to run scraper';
    toast.error(msg);
    throw error;
  } finally {
    setActionLoading(prev => ({ ...prev, scraper: false }));
  }
};

export const handleProcessPending = async (setActionLoading) => {
  try {
    setActionLoading(prev => ({ ...prev, pending: true }));
    const result = await articleService.runProcessor();
    toast.success('Processing started! Articles will be drafted soon.');
    return result;
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to process articles';
    toast.error(msg);
    throw error;
  } finally {
    setActionLoading(prev => ({ ...prev, pending: false }));
  }
};
