import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import * as newsroomService from '../services/newsroomService';

const RawArticlesPipeline = ({ refreshTrigger }) => {
  const [rawArticles, setRawArticles] = useState([]);
  const [pendingArticles, setPendingArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingAll, setProcessingAll] = useState(false);
  const [selectedRaw, setSelectedRaw] = useState(null);

  const fetchRawArticles = async () => {
    setLoading(true);
    try {
      const [allRaw, pending] = await Promise.all([
        newsroomService.getAllRawArticles(),
        newsroomService.getPendingRawArticles()
      ]);
      setRawArticles(Array.isArray(allRaw) ? allRaw : []);
      setPendingArticles(Array.isArray(pending) ? pending : []);
    } catch (error) {
      toast.error('Failed to fetch raw articles');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRawArticles();
  }, [refreshTrigger]);

  const handleProcessAll = async () => {
    if (pendingArticles.length === 0) {
      toast.info('No pending articles to process');
      return;
    }

    setProcessingAll(true);
    try {
      await newsroomService.processAllPending();
      toast.success(`Processing ${pendingArticles.length} articles...`);
      setTimeout(() => fetchRawArticles(), 2000);
    } catch (error) {
      toast.error('Processing failed: ' + error.message);
    } finally {
      setProcessingAll(false);
    }
  };

  const RawArticlePreview = ({ article }) => (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Raw Article Preview</h2>
          <button onClick={() => setSelectedRaw(null)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{article.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Source: <span className="font-mono">{article.source}</span> | Status: <span className="font-semibold">{article.status}</span>
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-md max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700">
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm">
              {article.content}
            </p>
          </div>
          <button
            onClick={() => setSelectedRaw(null)}
            className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 dark:bg-slate-950 p-6 md:p-8 rounded-xl transition-colors">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
            Raw Articles Pipeline
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Monitor scraped articles before AI processing
          </p>
        </div>
        <button
          onClick={fetchRawArticles}
          className="p-2 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
        >
          <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Scraped</p>
          <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{rawArticles.length}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-4">
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-1">Pending Processing</p>
          <p className="text-3xl font-semibold text-amber-800 dark:text-amber-200">{pendingArticles.length}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4">
          <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-1">Processed</p>
          <p className="text-3xl font-semibold text-emerald-800 dark:text-emerald-200">
            {rawArticles.length - pendingArticles.length}
          </p>
        </div>
      </div>

      {/* Bulk Actions */}
      {pendingArticles.length > 0 && (
        <div className="mb-6 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                {pendingArticles.length} articles ready for processing
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Click the button to process all pending articles through the AI pipeline
              </p>
            </div>
            <button
              onClick={handleProcessAll}
              disabled={processingAll}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 text-slate-100 dark:text-slate-900 rounded-md font-medium transition-colors whitespace-nowrap"
            >
              {processingAll ? (
                <>
                  <div className="animate-spin">
                    <RefreshCw size={20} />
                  </div>
                  Processing...
                </>
              ) : (
                <>
                  <Zap size={20} />
                  Process All
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Articles List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Article Status
        </h3>

        {loading ? (
          <div className="text-center py-12 text-slate-600 dark:text-slate-400">
            <div className="animate-spin inline-block mb-2">
              <RefreshCw size={32} />
            </div>
            <p>Loading raw articles...</p>
          </div>
        ) : rawArticles.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-slate-600 dark:text-slate-400 font-medium">No raw articles yet</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Run the scraper to import articles</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {rawArticles.map((article) => (
              <div
                key={article.id}
                className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 line-clamp-2">
                      {article.title}
                    </h4>
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                      <span>{article.source || 'Unknown'}</span>
                      <span>•</span>
                      <span>
                        {article.created_at ? new Date(article.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      article.status === 'pending'
                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {article.status?.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedRaw(article)}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-700 dark:text-slate-300"
                      title="Preview"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {selectedRaw && <RawArticlePreview article={selectedRaw} />}
    </div>
  );
};

export default RawArticlesPipeline;
