/* eslint-disable */
// ================================================
// REACT ADMIN PANEL - BACKEND API INTEGRATION
// ================================================
//
// Complete examples for integrating backend APIs
// into your existing React dashboard
//

// ========== 1. UPDATE DASHBOARD.JSX ==========
// Add these imports:
/*
import { handleRunScraper, handleProcessPending, checkBackendHealth, fetchBackendStats } from '../api/dashboardService';
*/

// Add this useEffect hook to your Dashboard component:
/*
useEffect(() => {
  const initDashboard = async () => {
    setLoading(true);
    try {
      // Check backend health
      const health = await checkBackendHealth();
      setSystemHealth(prev => ({
        ...prev,
        llm: health.llm,
        db: health.db,
        backend: health.connected
      }));

      // Fetch real stats from backend
      const stats = await fetchBackendStats();
      if (stats) {
        setStats(stats);
        setAgentStats(prev => ({
          ...prev,
          articlesTotal: stats.total,
          articlesDraft: stats.draft,
          articlesPublished: stats.published,
          rawPending: stats.pending
        }));
      }
    } catch (error) {
      console.error('Failed to init dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  initDashboard();
}, []);
*/

// Replace your Quick Actions handlers:
/*
const handleRunScraper = async () => {
  try {
    await handleRunScraper(setActionLoading);
    // Refresh stats after 2 seconds
    setTimeout(async () => {
      const stats = await fetchBackendStats();
      if (stats) {
        setStats(stats);
        setAgentStats(prev => ({
          ...prev,
          articlesTotal: stats.total,
          articlesDraft: stats.draft
        }));
      }
    }, 2000);
  } catch (error) {
    console.error(error);
  }
};

const handleProcessPending = async () => {
  try {
    await handleProcessPending(setActionLoading);
    // Refresh stats after 2 seconds
    setTimeout(async () => {
      const stats = await fetchBackendStats();
      if (stats) {
        setStats(stats);
        setAgentStats(prev => ({
          ...prev,
          articlesTotal: stats.total,
          articlesDraft: stats.draft
        }));
      }
    }, 2000);
  } catch (error) {
    console.error(error);
  }
};
*/

// ========== 2. ARTICLE SERVICE METHODS ==========

export const articleServiceMethods = {
  // Get all articles
  getArticles: async () => {
    /*
    const response = await api.get('/articles');
    return response.data; // Returns array of articles
    */
  },

  // Get only published articles
  getPublished: async () => {
    /*
    const response = await api.get('/articles/published');
    return response.data;
    */
  },

  // Approve article (draft -> approved)
  approveArticle: async (id) => {
    /*
    const response = await api.put(`/articles/${id}/approve`);
    return response.data; // Returns "Approved ✅"
    */
  },

  // Publish article (approved -> published)
  publishArticle: async (id) => {
    /*
    const response = await api.put(`/articles/${id}/publish`);
    return response.data; // Returns "Published 🚀"
    */
  },

  // Edit article (update title, content, summary)
  editArticle: async (id, { title, content, summary }) => {
    /*
    const response = await api.put(`/articles/${id}`, {
      title,
      content,
      summary
    });
    return response.data; // Returns "Updated ✏️"
    */
  },

  // Run scraper
  runScraper: async () => {
    /*
    const response = await api.post('/scrape');
    return response.data;
    */
  },

  // Run AI processor
  runProcessor: async () => {
    /*
    const response = await api.post('/process');
    return response.data;
    */
  }
};

// ========== 3. COMPLETE ARTICLES PAGE EXAMPLE ==========

export const ArticlesPageExample = `
import React, { useEffect, useState } from 'react';
import articleService from '../api/articleService';
import EditArticleModal from '../components/EditArticleModal';
import toast from 'react-hot-toast';

const Articles = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingArticle, setEditingArticle] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const data = await articleService.getArticles();
      setArticles(data.articles || data || []);
    } catch (error) {
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await articleService.approveArticle(id);
      toast.success('Article approved ✅');
      loadArticles();
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const handlePublish = async (id) => {
    try {
      await articleService.publishArticle(id);
      toast.success('Article published 🚀');
      loadArticles();
    } catch (error) {
      toast.error('Failed to publish');
    }
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (updatedData) => {
    try {
      await articleService.editArticle(editingArticle.id, updatedData);
      toast.success('Article updated ✏️');
      setEditModalOpen(false);
      loadArticles();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Articles Management</h1>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {articles.map(article => (
            <tr key={article.id}>
              <td>{article.title}</td>
              <td>{article.category}</td>
              <td>{article.status}</td>
              <td>
                <button onClick={() => handleEdit(article)}>✏️ Edit</button>
                {String(article.status).toLowerCase() === 'draft' && (
                  <button onClick={() => handleApprove(article.id)}>✅ Approve</button>
                )}
                {String(article.status).toLowerCase() === 'approved' && (
                  <button onClick={() => handlePublish(article.id)}>🚀 Publish</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editModalOpen && editingArticle && (
        <EditArticleModal
          article={editingArticle}
          onSave={handleSaveEdit}
          onClose={() => setEditModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Articles;
`;

// ========== 4. MANUS CONTROL INTEGRATION ==========

export const ManusControlExample = `
// In ManusControl.jsx, replace the handlers:

const handleRunScraperNow = async () => {
  try {
    setLoading(true);
    const result = await articleService.runScraper();
    setMessage('Scraper completed! Check articles.');
    await refreshAll({ silent: true });
  } catch (error) {
    setMessage(error.response?.data?.message || 'Scraper failed');
  } finally {
    setLoading(false);
  }
};

const handleRunPending = async () => {
  try {
    setLoading(true);
    const result = await articleService.runProcessor();
    setMessage('Processing completed!');
    await refreshAll({ silent: true });
  } catch (error) {
    setMessage(error.response?.data?.message || 'Processing failed');
  } finally {
    setLoading(false);
  }
};

// Check LLM status
const checkLLMStatus = async () => {
  try {
    const health = await articleService.checkBackendHealth();
    return health.connected ? 'Running' : 'Offline';
  } catch (error) {
    return 'Offline';
  }
};
`;

// ========== 5. API ENDPOINTS REFERENCE ==========

export const APIEndpointsReference = {
  baseURL: 'http://localhost:5000/api',

  articles: {
    getAll: 'GET /articles',
    getPublished: 'GET /articles/published',
    create: 'POST /articles',
    update: 'PUT /articles/:id',
    delete: 'DELETE /articles/:id',
    approve: 'PUT /articles/:id/approve',
    publish: 'PUT /articles/:id/publish'
  },

  pipeline: {
    scrape: 'POST /scrape',
    process: 'POST /process'
  },

  exampleResponses: {
    getArticles: [
      {
        id: 1,
        title: 'Article Title',
        content: 'Full article content...',
        summary: 'Brief summary',
        category: 'Technology',
        source: 'ai',
        status: 'draft',
        created_at: '2026-03-20T00:00:00Z'
      }
    ],

    approveResponse: 'Approved ✅',
    publishResponse: 'Published 🚀',
    updateResponse: 'Updated ✏️'
  }
};

// ========== 6. ERROR HANDLING EXAMPLE ==========

export const errorHandlingExample = `
try {
  await articleService.approveArticle(id);
  toast.success('Approved!');
} catch (error) {
  // Error structure:
  // error.response.status - HTTP status code
  // error.response.data - Response body
  // error.message - Error message
  
  const message = error.response?.data?.message || error.message || 'Action failed';
  toast.error(message);
}
`;

// ========== 7. LOADING STATES EXAMPLE ==========

export const loadingStatesExample = `
const [actionLoading, setActionLoading] = useState({
  scraper: false,
  process: false,
  approve: null, // article ID
  publish: null, // article ID
  edit: null     // article ID
});

// Usage:
const handleApprove = async (id) => {
  setActionLoading(prev => ({ ...prev, approve: id }));
  try {
    await articleService.approveArticle(id);
  } finally {
    setActionLoading(prev => ({ ...prev, approve: null }));
  }
};

// In template:
<button disabled={actionLoading.approve === article.id}>
  {actionLoading.approve === article.id ? 'Loading...' : 'Approve'}
</button>
`;
