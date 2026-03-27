import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Zap, Eye, Play, Trash2, CheckCircle, XCircle, Clock, Copy, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import * as newsroomService from '../services/newsroomService';

// ── Status badge config ──────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:    { label: 'PENDING',    icon: Clock,        color: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  processing: { label: 'PROCESSING', icon: RefreshCw,    color: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', spin: true },
  processed:  { label: 'PROCESSED',  icon: CheckCircle,  color: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  duplicate:  { label: 'DUPLICATE',  icon: Copy,         color: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  failed:     { label: 'FAILED',     icon: XCircle,      color: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon size={11} className={cfg.spin ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
}

// ── Stats card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, colorClass }) {
  return (
    <div className={`rounded-xl p-4 border ${colorClass}`}>
      <p className="text-sm font-medium mb-1 opacity-80">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

// ── Preview modal ────────────────────────────────────────────────────────────
function RawArticlePreview({ article, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Raw Article Preview</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
            <XCircle size={22} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{article.title}</h3>
            <div className="flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span>Source: <span className="font-mono">{article.source || 'Unknown'}</span></span>
              <span>•</span>
              <span><StatusBadge status={article.status} /></span>
              <span>•</span>
              <span>{article.created_at ? new Date(article.created_at).toLocaleString() : 'N/A'}</span>
            </div>
          </div>
          {article.url && (
            <a href={article.url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 underline break-all block">
              {article.url}
            </a>
          )}
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-700">
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
              {article.content || 'No content available.'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm modal ─────────────────────────────────────────────────────
function DeleteConfirm({ article, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-950/60 rounded-lg">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Delete Raw Article</h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
          Are you sure you want to delete <span className="font-semibold text-slate-800 dark:text-slate-200">"{article.title?.slice(0, 60)}…"</span>?
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(article.id)}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
const RawArticlesPipeline = ({ refreshTrigger }) => {
  const [rawArticles, setRawArticles] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [processingAll, setProcessingAll] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set()); // per-row spinners
  const [selectedRaw, setSelectedRaw]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const pendingArticles = rawArticles.filter((a) => a.status === 'pending');

  // Count helpers
  const counts = rawArticles.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchRawArticles = useCallback(async () => {
    setLoading(true);
    try {
      const all = await newsroomService.getAllRawArticles();
      setRawArticles(Array.isArray(all) ? all : []);
    } catch (error) {
      toast.error('Failed to fetch raw articles');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRawArticles();
  }, [refreshTrigger, fetchRawArticles]);

  // ── Process All ────────────────────────────────────────────────────────
  const handleProcessAll = async () => {
    if (pendingArticles.length === 0) {
      toast('No pending articles to process', { icon: 'ℹ️' });
      return;
    }
    setProcessingAll(true);
    const toastId = toast.loading(`Processing ${pendingArticles.length} articles via AI pipeline…`);
    try {
      const result = await newsroomService.processAllPending();
      toast.success(
        `Done! ✅  Processed: ${result.processed} | Duplicates: ${result.duplicates} | Failed: ${result.failed}`,
        { id: toastId, duration: 6000 }
      );
      await fetchRawArticles();
    } catch (error) {
      toast.error('Batch processing failed: ' + error.message, { id: toastId });
    } finally {
      setProcessingAll(false);
    }
  };

  // ── Process Single ─────────────────────────────────────────────────────
  const handleProcessSingle = async (article) => {
    setProcessingIds((prev) => new Set([...prev, article.id]));
    // Optimistically update status in UI
    setRawArticles((prev) =>
      prev.map((a) => (a.id === article.id ? { ...a, status: 'processing' } : a))
    );
    const toastId = toast.loading(`Processing "${article.title?.slice(0, 40)}…"`);
    try {
      const result = await newsroomService.processSingleArticle(article.id);
      if (result.duplicate) {
        toast(`Duplicate detected — skipped`, { id: toastId, icon: '📋', duration: 4000 });
      } else {
        toast.success(`✅ Saved as draft (SEO: ${result.seo_score})`, { id: toastId, duration: 4000 });
      }
      await fetchRawArticles();
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      toast.error('Processing failed: ' + msg, { id: toastId });
      await fetchRawArticles();
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(article.id);
        return next;
      });
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async (id) => {
    setDeleteTarget(null);
    const toastId = toast.loading('Deleting…');
    try {
      await newsroomService.deleteRawArticle(id);
      toast.success('Raw article deleted', { id: toastId });
      setRawArticles((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      toast.error('Delete failed: ' + err.message, { id: toastId });
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 p-6 md:p-8 rounded-xl transition-colors">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-1">
            Raw Articles Pipeline
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Monitor and process scraped articles through the AI pipeline
          </p>
        </div>
        <button onClick={fetchRawArticles}
          className="p-2.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          title="Refresh">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total" value={rawArticles.length}
          colorClass="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100" />
        <StatCard label="Pending" value={counts.pending || 0}
          colorClass="bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200" />
        <StatCard label="Processed" value={counts.processed || 0}
          colorClass="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200" />
        <StatCard label="Duplicates" value={counts.duplicate || 0}
          colorClass="bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900 text-purple-800 dark:text-purple-200" />
        <StatCard label="Failed" value={counts.failed || 0}
          colorClass="bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200" />
      </div>

      {/* Bulk Action Banner */}
      {pendingArticles.length > 0 && (
        <div className="mb-6 p-4 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {pendingArticles.length} article{pendingArticles.length > 1 ? 's' : ''} ready for AI processing
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Articles are processed in batches of 3 to avoid overloading Ollama
            </p>
          </div>
          <button onClick={handleProcessAll} disabled={processingAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-slate-300 disabled:opacity-50 text-slate-100 dark:text-slate-900 rounded-lg font-medium transition-colors whitespace-nowrap">
            {processingAll ? (
              <><RefreshCw size={18} className="animate-spin" /> Processing…</>
            ) : (
              <><Zap size={18} /> Process All Pending</>
            )}
          </button>
        </div>
      )}

      {/* Articles List */}
      <div>
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Article Status ({rawArticles.length})
        </h3>

        {loading ? (
          <div className="text-center py-16 text-slate-500 dark:text-slate-400">
            <RefreshCw size={32} className="animate-spin mx-auto mb-3" />
            <p>Loading raw articles…</p>
          </div>
        ) : rawArticles.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="font-medium text-slate-600 dark:text-slate-400">No raw articles yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Run the scraper to import articles</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {rawArticles.map((article) => {
              const isProcessingThis = processingIds.has(article.id);
              const canProcess = article.status === 'pending' || article.status === 'failed';

              return (
                <div key={article.id}
                  className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-3">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 line-clamp-2 text-sm leading-snug">
                        {article.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="truncate max-w-[140px]">{article.source || 'Unknown'}</span>
                        <span>•</span>
                        <span>{article.created_at ? new Date(article.created_at).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>

                    {/* Status + Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={article.status} />

                      {/* Preview */}
                      <button onClick={() => setSelectedRaw(article)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                        title="Preview">
                        <Eye size={16} />
                      </button>

                      {/* Process (only for pending/failed) */}
                      <button
                        onClick={() => handleProcessSingle(article)}
                        disabled={!canProcess || isProcessingThis || processingAll}
                        className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={canProcess ? 'Process with AI' : `Cannot process (${article.status})`}>
                        {isProcessingThis
                          ? <RefreshCw size={16} className="animate-spin" />
                          : <Play size={16} />
                        }
                      </button>

                      {/* Delete */}
                      <button onClick={() => setDeleteTarget(article)}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 dark:text-red-400 transition-colors"
                        title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedRaw && <RawArticlePreview article={selectedRaw} onClose={() => setSelectedRaw(null)} />}
      {deleteTarget && (
        <DeleteConfirm
          article={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default RawArticlesPipeline;
