import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, Zap, Eye, Play, Trash2, CheckCircle, XCircle,
  Clock, Copy, AlertCircle, Info, ChevronDown, ChevronUp, StopCircle, RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as newsroomService from '../services/newsroomService';

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:    { label: 'Waiting',     icon: Clock,        color: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800', desc: 'Ready to be processed by AI' },
  processing: { label: 'Working…',   icon: RefreshCw,    color: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', spin: true, desc: 'AI is rewriting this right now' },
  processed:  { label: 'Done ✓',     icon: CheckCircle,  color: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', desc: 'Saved as draft — go to Articles to publish' },
  duplicate:  { label: 'Duplicate',  icon: Copy,         color: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800', desc: 'Already exists — skipped automatically' },
  failed:     { label: 'Skipped',    icon: XCircle,      color: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800', desc: 'Could not process — content too short or unavailable' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon size={11} className={cfg.spin ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, subtext, colorClass }) {
  return (
    <div className={`rounded-xl p-4 border ${colorClass}`}>
      <p className="text-xs font-medium mb-1 opacity-70 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {subtext && <p className="text-xs mt-1 opacity-60">{subtext}</p>}
    </div>
  );
}

// ── How it works tooltip ──────────────────────────────────────────────────────
function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 text-left text-blue-800 dark:text-blue-200 font-medium"
      >
        <span className="flex items-center gap-2"><Info size={16} /> How does this work?</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm text-blue-800 dark:text-blue-200">
          {[
            { n: '1', t: 'Articles arrive', d: 'The scraper automatically collects news from various sources and stores them here as "Waiting".' },
            { n: '2', t: 'AI rewrites them', d: 'Click "Run AI on All" — the AI cleans, rewrites, and adds SEO keywords to each article.' },
            { n: '3', t: 'They become drafts', d: 'Successfully processed articles are saved as drafts in the Articles section.' },
            { n: '4', t: 'You publish', d: 'Go to Articles, review the draft, and click Publish to make it live on the website.' },
          ].map(s => (
            <div key={s.n} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{s.n}</div>
              <div>
                <p className="font-semibold">{s.t}</p>
                <p className="text-xs opacity-70 mt-0.5">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Preview modal ─────────────────────────────────────────────────────────────
function RawArticlePreview({ article, onClose }) {
  const statusCfg = STATUS_CONFIG[article.status] || STATUS_CONFIG.pending;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Article Preview</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Raw source content before AI processing</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
            <XCircle size={22} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">{article.title}</h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-2">
              <StatusBadge status={article.status} />
              <span>Source: <span className="font-mono">{article.source || 'Unknown'}</span></span>
              <span>{article.created_at ? new Date(article.created_at).toLocaleString() : 'N/A'}</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              Status meaning: {statusCfg.desc}
            </p>
          </div>
          {article.url && (
            <a href={article.url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 underline break-all block">
              View original article →
            </a>
          )}
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Raw Content</p>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-700">
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
                {article.content || 'No content available.'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg font-medium transition-colors text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm modal ──────────────────────────────────────────────────────
function DeleteConfirm({ article, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-red-100 dark:bg-red-950/60 rounded-lg">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Remove this article?</h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
          You're about to permanently remove:
        </p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 line-clamp-2">
          "{article.title?.slice(0, 80)}"
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          This cannot be undone. Only remove articles you don't want to publish.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg font-medium transition-colors text-sm">
            Keep it
          </button>
          <button onClick={() => onConfirm(article.id)}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm">
            Yes, remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Processing Banner ────────────────────────────────────────────────────────
function ProcessingBanner({ status, onCancel }) {
  const pct = status.total > 0 ? Math.round((status.current / status.total) * 100) : 0;
  
  return (
    <div className="mb-6 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm relative overflow-hidden">
      {/* Background progress bar hint */}
      <div 
        className="absolute left-0 top-0 bottom-0 bg-blue-100 dark:bg-blue-800/20 transition-all duration-500 ease-out z-0"
        style={{ width: `${pct}%` }}
      />
      
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <RefreshCw size={20} className="animate-spin text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100">
              AI is working… ({status.current} of {status.total})
            </h3>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {pct}% Complete. You can leave this page — processing continues in the background.
          </p>
        </div>
        
        <button 
          onClick={onCancel}
          disabled={status.cancel}
          className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 rounded-lg font-medium transition-all text-sm shadow-sm disabled:opacity-50"
        >
          {status.cancel ? (
            <><RefreshCw size={16} className="animate-spin" /> Stopping...</>
          ) : (
            <><StopCircle size={16} /> Stop AI</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const RawArticlesPipeline = ({ refreshTrigger }) => {
  const [rawArticles, setRawArticles] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [selectedRaw, setSelectedRaw]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filter, setFilter]             = useState('all');
  
  // Pipeline global status
  const [pipelineStatus, setPipelineStatus] = useState({ isProcessing: false, total: 0, current: 0, cancel: false });
  const pollIntervalRef = useRef(null);

  const counts = rawArticles.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});
  const pendingCount = counts.pending || 0;

  const filteredArticles = filter === 'all'
    ? rawArticles
    : rawArticles.filter(a => a.status === filter);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchRawArticles = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const all = await newsroomService.getAllRawArticles();
      setRawArticles(Array.isArray(all) ? all : []);
    } catch {
      toast.error('Could not load articles — is the server running?');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const fetchPipelineStatus = useCallback(async () => {
    try {
      const status = await newsroomService.getPipelineStatus();
      if (status) {
        setPipelineStatus(status);
        // If it was processing but just finished, refresh the article list
        if (!status.isProcessing && pipelineStatus.isProcessing) {
          fetchRawArticles(false);
        }
      }
    } catch {
      // ignore
    }
  }, [pipelineStatus.isProcessing, fetchRawArticles]);

  // Setup polling
  useEffect(() => {
    fetchRawArticles();
    fetchPipelineStatus();
    
    // Poll every 3 seconds to keep UI in sync across tabs and show progress
    pollIntervalRef.current = setInterval(() => {
      fetchPipelineStatus();
      // Also silently refresh list if processing so we see statuses change live
      fetchRawArticles(false);
    }, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [refreshTrigger, fetchRawArticles, fetchPipelineStatus]);

  // ── Process All ────────────────────────────────────────────────────────
  const handleProcessAll = async () => {
    if (pendingCount === 0) {
      toast('No waiting articles to process', { icon: 'ℹ️' });
      return;
    }
    
    const toastId = toast.loading(`Starting AI on ${pendingCount} articles…`);
    try {
      const response = await newsroomService.processAllPending();
      if (response && response.success) {
        toast.success(response.message, { id: toastId });
        await fetchPipelineStatus(); // immediately update UI state
      }
    } catch (error) {
      toast.error('Something went wrong: ' + error.message, { id: toastId });
    }
  };

  const handleCancelPipeline = async () => {
    const toastId = toast.loading('Telling AI to stop...');
    try {
      const res = await newsroomService.cancelPipeline();
      if (res.success) {
        toast.success('AI will stop after the current article', { id: toastId });
        await fetchPipelineStatus();
      } else {
        toast.error(res.message, { id: toastId });
      }
    } catch (err) {
      toast.error('Could not stop AI: ' + err.message, { id: toastId });
    }
  };

  const handleReprocessFailed = async () => {
    const failedCount = counts.failed || 0;
    if (failedCount === 0) {
      toast('No skipped articles to reprocess', { icon: 'ℹ️' });
      return;
    }
    const toastId = toast.loading(`Reprocessing ${failedCount} skipped articles…`);
    try {
      const res = await newsroomService.reprocessFailed();
      if (res && res.success) {
        toast.success(res.message, { id: toastId, duration: 5000 });
        await fetchRawArticles(false);
        await fetchPipelineStatus();
      } else {
        toast.error(res?.message || 'Reprocess failed', { id: toastId });
      }
    } catch (err) {
      toast.error('Could not reprocess: ' + err.message, { id: toastId });
    }
  };

  // ── Process Single ─────────────────────────────────────────────────────
  const handleProcessSingle = async (article) => {
    if (pipelineStatus.isProcessing) {
      toast.error("Can't process single article while 'Run AI on All' is active");
      return;
    }

    setProcessingIds(prev => new Set([...prev, article.id]));
    setRawArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: 'processing' } : a));
    const toastId = toast.loading(`AI is processing: "${article.title?.slice(0, 40)}…"`);
    try {
      const result = await newsroomService.processSingleArticle(article.id);
      if (result.duplicate) {
        toast('This article already exists — skipped', { id: toastId, icon: '📋', duration: 4000 });
      } else {
        toast.success('Saved as draft! Go to Articles to publish it.', { id: toastId, duration: 5000 });
      }
      await fetchRawArticles(false);
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      toast.error('Could not process: ' + msg, { id: toastId });
      await fetchRawArticles(false);
    } finally {
      setProcessingIds(prev => { const next = new Set(prev); next.delete(article.id); return next; });
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async (id) => {
    setDeleteTarget(null);
    const toastId = toast.loading('Removing…');
    try {
      await newsroomService.deleteRawArticle(id);
      toast.success('Article removed', { id: toastId });
      setRawArticles(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      toast.error('Remove failed: ' + err.message, { id: toastId });
    }
  };

  // ── Filter tabs ────────────────────────────────────────────────────────
  const FILTERS = [
    { key: 'all',       label: 'All',       count: rawArticles.length },
    { key: 'pending',   label: 'Waiting',   count: pendingCount },
    { key: 'processed', label: 'Done',      count: counts.processed || 0 },
    { key: 'failed',    label: 'Skipped',   count: counts.failed || 0 },
    { key: 'duplicate', label: 'Duplicate', count: counts.duplicate || 0 },
  ];

  return (
    <div className="bg-slate-50 dark:bg-slate-950 p-6 md:p-8 rounded-xl transition-colors">

      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-1">
            AI Article Processing
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Scraped articles waiting to be rewritten and published
          </p>
        </div>
        <button onClick={() => fetchRawArticles(true)} disabled={pipelineStatus.isProcessing}
          className="p-2.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
          title="Refresh list">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* How it works (collapsible) */}
      <HowItWorks />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Waiting for AI" value={pendingCount}
          subtext="Ready to process"
          colorClass="bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200" />
        <StatCard label="Done — Drafts saved" value={counts.processed || 0}
          subtext="Ready to publish"
          colorClass="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200" />
        <StatCard label="Skipped (too short)" value={counts.failed || 0}
          subtext="Not enough content"
          colorClass="bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200" />
        <StatCard label="Duplicates removed" value={counts.duplicate || 0}
          subtext="Already published"
          colorClass="bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900 text-purple-800 dark:text-purple-200" />
      </div>

      {/* Main Action Banner */}
      {pipelineStatus.isProcessing ? (
        <ProcessingBanner status={pipelineStatus} onCancel={handleCancelPipeline} />
      ) : pendingCount > 0 ? (
        <div className="mb-6 p-5 bg-white dark:bg-slate-900 rounded-xl border-2 border-amber-300 dark:border-amber-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <p className="font-bold text-lg text-slate-900 dark:text-slate-100">
              {pendingCount} article{pendingCount !== 1 ? 's' : ''} waiting to be processed
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Click the button to let the AI rewrite and save them as drafts.
              Takes ~{Math.ceil(pendingCount * 8 / 60)} min.
            </p>
          </div>
          <button onClick={handleProcessAll}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors whitespace-nowrap text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5">
            <Zap size={18} />
            Run AI on All
          </button>
        </div>
      ) : rawArticles.length > 0 && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            All caught up! No articles waiting. Run the scraper from the Dashboard to fetch new articles.
          </p>
        </div>
      )}

      {/* Reprocess Skipped Banner */}
      {!pipelineStatus.isProcessing && (counts.failed || 0) > 0 && (
        <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-orange-600 dark:text-orange-400 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-orange-900 dark:text-orange-100">
                {counts.failed} skipped article{counts.failed !== 1 ? 's' : ''} — retry with AI?
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
                These were skipped earlier (content too short). The AI will now try to expand and rewrite them.
              </p>
            </div>
          </div>
          <button
            onClick={handleReprocessFailed}
            disabled={pipelineStatus.isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold text-sm transition-colors whitespace-nowrap shadow-sm disabled:opacity-50"
          >
            <RotateCcw size={15} />
            Retry All Skipped
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      {rawArticles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f.key
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}>
              {f.label} {f.count > 0 && <span className="ml-1 opacity-70">({f.count})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Articles List */}
      <div className="min-h-[300px]">
        {loading && rawArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
            <RefreshCw size={32} className="animate-spin mb-4 text-indigo-500" />
            <p className="font-medium text-slate-700 dark:text-slate-300">Loading articles…</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            {rawArticles.length === 0 ? (
              <>
                <p className="font-semibold text-slate-600 dark:text-slate-400 text-lg mb-1">No articles yet</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Go to the Dashboard and click <strong className="text-indigo-600 dark:text-indigo-400">Run Scraper</strong> to collect fresh news.
                </p>
              </>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-sm py-4">No articles matching this filter.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 pb-4">
            {filteredArticles.map((article) => {
              const isProcessingThis = processingIds.has(article.id) || (pipelineStatus.isProcessing && article.status === 'processing');
              const canProcess = (article.status === 'pending' || article.status === 'failed') && !pipelineStatus.isProcessing;
              const statusCfg = STATUS_CONFIG[article.status] || STATUS_CONFIG.pending;

              return (
                <div key={article.id}
                  className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1.5 line-clamp-2 text-sm leading-snug">
                        {article.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <StatusBadge status={article.status} />
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{article.source || 'Unknown source'}</span>
                          <span>•</span>
                          <span>{article.created_at ? new Date(article.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>
                        </div>
                      </div>
                      {/* Status explanation */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic flex items-center gap-1">
                        <Info size={12} className="opacity-70" /> {statusCfg.desc}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Preview */}
                      <button onClick={() => setSelectedRaw(article)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Preview article content">
                        <Eye size={16} />
                      </button>

                      {/* Process */}
                      {canProcess && (
                        <button
                          onClick={() => handleProcessSingle(article)}
                          disabled={isProcessingThis}
                          className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800/30 text-indigo-700 dark:text-indigo-400 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider"
                          title="Process this article with AI">
                          {isProcessingThis
                            ? <><RefreshCw size={13} className="animate-spin" /> Working…</>
                            : <><Play size={13} /> Process</>
                          }
                        </button>
                      )}

                      {/* Delete */}
                      <button onClick={() => setDeleteTarget(article)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 text-slate-400 transition-colors"
                        title="Remove this article">
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
