import React, { useState, useEffect, useMemo } from 'react';
import { Search, Eye, Trash2, CheckCircle2, Rocket, RefreshCw, FilePenLine, Sparkles } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as newsroomService from '../services/newsroomService';
import ArticlePreviewModal from './ArticlePreviewModal';

const ArticleTable = ({ refreshTrigger }) => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [actioningId, setActioningId] = useState(null);
  const itemsPerPage = 10;

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const data = await newsroomService.getAllArticles();
      setArticles(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch articles');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [refreshTrigger]);

  // Filter and search
  const filteredArticles = useMemo(() => {
    let filtered = articles;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title?.toLowerCase().includes(query) ||
        a.category?.toLowerCase().includes(query) ||
        a.source?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [articles, searchQuery, statusFilter]);

  // Pagination
  const paginatedArticles = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredArticles.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredArticles, currentPage]);

  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);

  const handleApprove = async (id) => {
    setActioningId(id);
    try {
      await newsroomService.approveArticle(id);
      toast.success('Article approved');
      fetchArticles();
    } catch (error) {
      toast.error('Failed to approve: ' + error.message);
    } finally {
      setActioningId(null);
    }
  };

  const handlePublish = async (id) => {
    setActioningId(id);
    try {
      await newsroomService.publishArticle(id);
      toast.success('Article published');
      fetchArticles();
    } catch (error) {
      toast.error('Failed to publish: ' + error.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this article permanently?')) return;

    setActioningId(id);
    try {
      await newsroomService.deleteArticle(id);
      toast.success('Article deleted');
      fetchArticles();
    } catch (error) {
      toast.error('Failed to delete: ' + error.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleRegenerate = async (article) => {
    setActioningId(article.id);
    const toastId = toast.loading('Regenerating article with AI...');
    try {
      const generated = await newsroomService.regenerateArticle({ 
        title: article.title, 
        content: article.content 
      });
      await newsroomService.updateArticle(article.id, generated);
      toast.success('Article regenerated successfully', { id: toastId });
      fetchArticles();
    } catch (error) {
      toast.error('AI regeneration failed. Please try again.', { id: toastId });
    } finally {
      setActioningId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'published':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'approved':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'draft':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const getSeoScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-700 dark:text-emerald-400';
    if (score >= 60) return 'text-amber-700 dark:text-amber-400';
    return 'text-rose-700 dark:text-rose-400';
  };

  const getQualityScoreColor = (score) => {
    if (score >= 75) return 'text-emerald-700 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-700 dark:text-amber-400';
    return 'text-rose-700 dark:text-rose-400';
  };

  return (
    <div className="bg-white dark:bg-slate-950 p-6 md:p-8 rounded-xl transition-colors border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Articles</h2>
          <button onClick={() => navigate('/ai-editor')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors font-medium">
            Create Article
          </button>
        </div>

        {/* Search and Filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by title, category, or source..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-slate-400/40 dark:focus:ring-slate-500/40 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-slate-400/40"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchArticles}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md font-medium flex items-center gap-2 justify-center transition-colors"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {/* Results count */}
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
          Showing <span className="font-semibold">{paginatedArticles.length}</span> of <span className="font-semibold">{filteredArticles.length}</span> articles
        </p>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-600 dark:text-slate-400">
          <div className="animate-spin inline-block">
            <RefreshCw size={32} />
          </div>
          <p className="mt-2">Loading articles...</p>
        </div>
      ) : paginatedArticles.length === 0 ? (
        <div className="text-center py-12 text-slate-600 dark:text-slate-400">
          <p className="text-lg font-medium">No articles found</p>
          <p className="text-sm">Try adjusting your filters or search query</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Title</th>
                  <th className="hidden md:table-cell text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Category</th>
                  <th className="hidden md:table-cell text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Source</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="hidden lg:table-cell text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">SEO</th>
                  <th className="hidden lg:table-cell text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Quality</th>
                  <th className="hidden lg:table-cell text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Readability</th>
                  <th className="hidden xl:table-cell text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Created</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedArticles.map((article) => (
                  <tr key={article.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[200px] md:max-w-xs whitespace-normal line-clamp-2">
                          {article.title}
                        </p>
                        {Number(article.ai_confidence || 0) < 60 && (
                          <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            ⚠ Low Quality
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden md:table-cell py-3 px-4 text-slate-600 dark:text-slate-400 text-sm">
                      {article.category || '—'}
                    </td>
                    <td className="hidden md:table-cell py-3 px-4 text-slate-600 dark:text-slate-400 text-sm">
                      {article.source || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(article.status)}`}>
                        {article.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className={`hidden lg:table-cell py-3 px-4 text-sm font-semibold ${getSeoScoreColor(Number(article.seo_score || 0))}`}>
                      {Number(article.seo_score || 0)} / 100
                    </td>
                    <td className={`hidden lg:table-cell py-3 px-4 text-sm font-semibold ${getQualityScoreColor(Number(article.quality_score || 0))}`}>
                      {Number(article.quality_score || 0)} / 100
                    </td>
                    <td className={`hidden lg:table-cell py-3 px-4 text-sm font-semibold ${getQualityScoreColor(Number(article.readability_score || 0))}`}>
                      {Number(article.readability_score || 0)} / 100
                    </td>
                    <td className="hidden xl:table-cell py-3 px-4 text-slate-600 dark:text-slate-400 text-sm">
                      {article.created_at ? new Date(article.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedArticle(article)}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-700 dark:text-slate-300"
                          title="Preview"
                          disabled={actioningId !== null}
                        >
                          <Eye size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/articles/edit/${article.id}`, { state: { focusSeo: true } });
                          }}
                          className={`p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-indigo-700 dark:text-indigo-400 block ${actioningId !== null ? 'opacity-50 pointer-events-none' : ''}`}
                          title="Edit SEO"
                        >
                          <FilePenLine size={18} />
                        </button>

                        {article.status?.toLowerCase() === 'draft' && (
                          <button
                            onClick={() => handleApprove(article.id)}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-amber-700 dark:text-amber-400 disabled:opacity-50"
                            title="Approve"
                            disabled={actioningId !== null}
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        )}

                        {(Number(article.ai_confidence || 0) < 70 || Number(article.seo_score || 0) < 70 || Number(article.readability_score || 0) < 50) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRegenerate(article);
                            }}
                            className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors text-purple-600 dark:text-purple-400 disabled:opacity-50"
                            title="AI will regenerate the article to improve SEO, readability and overall quality."
                            disabled={actioningId !== null}
                          >
                            {actioningId === article.id ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                          </button>
                        )}

                        {article.status?.toLowerCase() !== 'published' && (
                          <button
                            onClick={() => handlePublish(article.id)}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-emerald-700 dark:text-emerald-400 disabled:opacity-50"
                            title="Publish"
                            disabled={actioningId !== null}
                          >
                            <Rocket size={18} />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(article.id)}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-rose-700 dark:text-rose-400 disabled:opacity-50"
                          title="Delete"
                          disabled={actioningId !== null}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-slate-100 dark:text-slate-900 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      {selectedArticle && (
        <ArticlePreviewModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onActionSuccess={() => {
            setSelectedArticle(null);
            fetchArticles();
          }}
        />
      )}
    </div>
  );
};

export default ArticleTable;
