import React, { useEffect, useState } from 'react';
import agentService from '../api/agentService';

const ManusControl = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const [health, setHealth] = useState(null);
    const [aiStatus, setAiStatus] = useState(null);
    const [runtime, setRuntime] = useState(null);
    const [stats, setStats] = useState(null);
    const [queue, setQueue] = useState(null);
    const [articles, setArticles] = useState([]);

    const [runPendingLimit, setRunPendingLimit] = useState(10);
    const [runCycleLimit, setRunCycleLimit] = useState(10);
    const [runCycleIncludeScraper, setRunCycleIncludeScraper] = useState(true);

    const [processTextInput, setProcessTextInput] = useState('');
    const [processTextTitle, setProcessTextTitle] = useState('');
    const [processUrlInput, setProcessUrlInput] = useState('');
    const [processUrlTitle, setProcessUrlTitle] = useState('');
    const [generateTopic, setGenerateTopic] = useState('');
    const [generateTitle, setGenerateTitle] = useState('');
    const [lastResult, setLastResult] = useState(null);

    const [articleFilterStatus, setArticleFilterStatus] = useState('');

    useEffect(() => {
        refreshAll();
    }, []);

    const withAction = async (fn, successText) => {
        try {
            setLoading(true);
            setMessage('');
            const result = await fn();
            setMessage(successText || 'Action completed successfully');
            return result;
        } catch (error) {
            const msg = error?.response?.data?.message || error.message || 'Action failed';
            setMessage(msg);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const refreshAll = async () => {
        await withAction(async () => {
            const [h, a, r, s, q, arts] = await Promise.all([
                agentService.getHealthStatus(),
                agentService.getAiStatus(),
                agentService.getRuntimeConfig(),
                agentService.getStats(),
                agentService.getQueue(20),
                agentService.getArticles(20, null, articleFilterStatus || null),
            ]);

            setHealth(h);
            setAiStatus(a);
            setRuntime(r);
            setStats(s);
            setQueue(q);
            setArticles(arts?.articles || []);
        }, 'Manus dashboard refreshed');
    };

    const handleToggleScraper = async () => {
        if (!runtime) return;
        await withAction(async () => {
            const res = await agentService.toggleWebScraper(!runtime.web_scraper_enabled);
            setRuntime((prev) => ({ ...prev, web_scraper_enabled: res.web_scraper_enabled }));
        }, 'Web scraper state updated');
    };

    const handleRunScraperNow = async () => {
        await withAction(async () => {
            const result = await agentService.runScraperNow();
            setMessage(`Scraper completed. Inserted: ${result.inserted ?? 0}`);
            await refreshAll();
        });
    };

    const handleRunPending = async () => {
        await withAction(async () => {
            const result = await agentService.runPendingQueue(Number(runPendingLimit));
            setMessage(`Processed ${result.processed ?? 0}, saved ${result.saved ?? 0}`);
            await refreshAll();
        });
    };

    const handleRunCycle = async () => {
        await withAction(async () => {
            const result = await agentService.runFullCycle(Number(runCycleLimit), runCycleIncludeScraper);
            setMessage(`Full cycle done. Saved: ${result.saved ?? 0}`);
            await refreshAll();
        });
    };

    const handleProcessText = async () => {
        if (!processTextInput.trim()) return;
        await withAction(async () => {
            const result = await agentService.processText(processTextInput, processTextTitle);
            setLastResult(result);
            await refreshAll();
        }, 'Manual text processed successfully');
    };

    const handleProcessUrl = async () => {
        if (!processUrlInput.trim()) return;
        await withAction(async () => {
            const result = await agentService.processUrl(processUrlInput, processUrlTitle);
            setLastResult(result);
            await refreshAll();
        }, 'URL processed successfully');
    };

    const handleGenerateArticle = async () => {
        if (!generateTopic.trim()) return;
        await withAction(async () => {
            const result = await agentService.generateArticle(generateTopic, generateTitle);
            setLastResult(result);
            await refreshAll();
        }, 'Article generated successfully');
    };

    const handleApproveArticle = async (id) => {
        await withAction(async () => {
            await agentService.approveArticle(id);
            await refreshAll();
        }, `Article ${id} approved`);
    };

    const statusBadgeClass = (status) => {
        const val = (status || '').toLowerCase();
        if (val.includes('running') || val.includes('ok') || val.includes('published')) {
            return 'bg-green-100 text-green-700';
        }
        if (val.includes('pending') || val.includes('draft') || val.includes('model_not_found')) {
            return 'bg-yellow-100 text-yellow-700';
        }
        return 'bg-red-100 text-red-700';
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">Manus Control Center</h1>
                <button
                    onClick={refreshAll}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                    {loading ? 'Working...' : 'Refresh'}
                </button>
            </div>

            {message ? (
                <div className="px-4 py-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                    {message}
                </div>
            ) : null}

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border rounded-xl p-4">
                    <p className="text-sm text-gray-500">API</p>
                    <p className="text-xl font-semibold mt-1">{health?.api || '-'}</p>
                </div>
                <div className="bg-white border rounded-xl p-4">
                    <p className="text-sm text-gray-500">LLM Model</p>
                    <p className="text-xl font-semibold mt-1">{aiStatus?.model || health?.model || '-'}</p>
                </div>
                <div className="bg-white border rounded-xl p-4">
                    <p className="text-sm text-gray-500">LLM Status</p>
                    <span className={`inline-flex mt-1 px-2 py-1 text-sm rounded-full ${statusBadgeClass(aiStatus?.status || health?.ollama)}`}>
                        {aiStatus?.status || health?.ollama || '-'}
                    </span>
                </div>
                <div className="bg-white border rounded-xl p-4">
                    <p className="text-sm text-gray-500">Response Time</p>
                    <p className="text-xl font-semibold mt-1">{aiStatus?.response_time_ms ?? '-'} ms</p>
                </div>
            </section>

            <section className="bg-white border rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-semibold">Runtime Controls</h2>
                <div className="flex flex-wrap items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${runtime?.web_scraper_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        Web Scraper: {runtime?.web_scraper_enabled ? 'ON' : 'OFF'}
                    </span>
                    <button
                        onClick={handleToggleScraper}
                        disabled={loading || !runtime}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                        Toggle Scraper
                    </button>
                    <button
                        onClick={handleRunScraperNow}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                        Run Scraper Now
                    </button>
                </div>
            </section>

            <section className="bg-white border rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-semibold">Pipeline Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-600">Run Pending Limit (1-100)</label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={runPendingLimit}
                            onChange={(e) => setRunPendingLimit(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        <button
                            onClick={handleRunPending}
                            disabled={loading}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                            Process Pending Queue
                        </button>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-600">Run Full Cycle Limit (1-100)</label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={runCycleLimit}
                            onChange={(e) => setRunCycleLimit(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input
                                type="checkbox"
                                checked={runCycleIncludeScraper}
                                onChange={(e) => setRunCycleIncludeScraper(e.target.checked)}
                            />
                            Include scraper in cycle
                        </label>
                        <button
                            onClick={handleRunCycle}
                            disabled={loading}
                            className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
                        >
                            Run Full Cycle
                        </button>
                    </div>
                </div>
            </section>

            <section className="bg-white border rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-semibold">AI Processing Studio</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <h3 className="font-medium">Process Manual Text</h3>
                        <input
                            placeholder="Title (optional)"
                            value={processTextTitle}
                            onChange={(e) => setProcessTextTitle(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        <textarea
                            placeholder="Paste article content"
                            value={processTextInput}
                            onChange={(e) => setProcessTextInput(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg min-h-36"
                        />
                        <button
                            onClick={handleProcessText}
                            disabled={loading || !processTextInput.trim()}
                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                            Process Text
                        </button>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-medium">Process URL</h3>
                        <input
                            placeholder="Title (optional)"
                            value={processUrlTitle}
                            onChange={(e) => setProcessUrlTitle(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        <textarea
                            placeholder="https://news-site/article"
                            value={processUrlInput}
                            onChange={(e) => setProcessUrlInput(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg min-h-36"
                        />
                        <button
                            onClick={handleProcessUrl}
                            disabled={loading || !processUrlInput.trim()}
                            className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60"
                        >
                            Process URL
                        </button>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-medium">Generate Article</h3>
                        <input
                            placeholder="Title (optional)"
                            value={generateTitle}
                            onChange={(e) => setGenerateTitle(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        <textarea
                            placeholder="Enter topic / prompt"
                            value={generateTopic}
                            onChange={(e) => setGenerateTopic(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg min-h-36"
                        />
                        <button
                            onClick={handleGenerateArticle}
                            disabled={loading || !generateTopic.trim()}
                            className="px-4 py-2 rounded-lg bg-cyan-700 text-white hover:bg-cyan-800 disabled:opacity-60"
                        >
                            Generate
                        </button>
                    </div>
                </div>

                {lastResult ? (
                    <div className="bg-gray-50 border rounded-lg p-4">
                        <h3 className="font-medium mb-2">Last Result</h3>
                        <p className="text-sm text-gray-700"><strong>ID:</strong> {lastResult.db_id ?? '-'}</p>
                        <p className="text-sm text-gray-700"><strong>Title:</strong> {lastResult.title || '-'}</p>
                        <p className="text-sm text-gray-700"><strong>Status:</strong> {lastResult.status || '-'}</p>
                        <p className="text-sm text-gray-700"><strong>Category:</strong> {lastResult.category || '-'}</p>
                        <p className="text-sm text-gray-700"><strong>Slug:</strong> {lastResult.slug || '-'}</p>
                    </div>
                ) : null}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white border rounded-xl p-6 space-y-3">
                    <h2 className="text-xl font-semibold">Pipeline Stats</h2>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 rounded bg-gray-50"><strong>Raw Total:</strong> {stats?.raw_total ?? '-'}</div>
                        <div className="p-3 rounded bg-gray-50"><strong>Raw Pending:</strong> {stats?.raw_pending ?? '-'}</div>
                        <div className="p-3 rounded bg-gray-50"><strong>Raw Processed:</strong> {stats?.raw_processed ?? '-'}</div>
                        <div className="p-3 rounded bg-gray-50"><strong>Raw Rejected:</strong> {stats?.raw_rejected ?? '-'}</div>
                        <div className="p-3 rounded bg-gray-50"><strong>Articles:</strong> {stats?.articles_total ?? '-'}</div>
                        <div className="p-3 rounded bg-gray-50"><strong>Published:</strong> {stats?.articles_published ?? '-'}</div>
                    </div>
                </div>

                <div className="bg-white border rounded-xl p-6 space-y-3">
                    <h2 className="text-xl font-semibold">Queue Snapshot</h2>
                    <p className="text-sm text-gray-600">Pending Count: {queue?.pending_count ?? '-'}</p>
                    <div className="max-h-56 overflow-auto border rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left">ID</th>
                                    <th className="px-3 py-2 text-left">Title</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(queue?.pending_items || []).map((item) => (
                                    <tr key={item.id} className="border-t">
                                        <td className="px-3 py-2">{item.id}</td>
                                        <td className="px-3 py-2 truncate max-w-xs">{item.title}</td>
                                    </tr>
                                ))}
                                {!queue?.pending_items?.length ? (
                                    <tr>
                                        <td className="px-3 py-6 text-center text-gray-400" colSpan="2">No pending items</td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="bg-white border rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Manus Articles</h2>
                    <div className="flex items-center gap-2">
                        <select
                            value={articleFilterStatus}
                            onChange={(e) => setArticleFilterStatus(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-sm"
                        >
                            <option value="">All</option>
                            <option value="draft">draft</option>
                            <option value="published">published</option>
                            <option value="rejected">rejected</option>
                        </select>
                        <button
                            onClick={refreshAll}
                            disabled={loading}
                            className="px-3 py-2 rounded-lg bg-gray-800 text-white text-sm"
                        >
                            Reload
                        </button>
                    </div>
                </div>

                <div className="overflow-auto border rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left">ID</th>
                                <th className="px-3 py-2 text-left">Title</th>
                                <th className="px-3 py-2 text-left">Status</th>
                                <th className="px-3 py-2 text-left">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {articles.map((article) => (
                                <tr key={article.id || article.db_id} className="border-t">
                                    <td className="px-3 py-2">{article.id || article.db_id || '-'}</td>
                                    <td className="px-3 py-2">{article.title || '-'}</td>
                                    <td className="px-3 py-2">
                                        <span className={`px-2 py-1 rounded-full text-xs ${statusBadgeClass(article.status)}`}>
                                            {article.status || '-'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        {(article.status || '').toLowerCase() !== 'published' ? (
                                            <button
                                                onClick={() => handleApproveArticle(article.id || article.db_id)}
                                                disabled={loading || !(article.id || article.db_id)}
                                                className="px-3 py-1 rounded bg-green-600 text-white text-xs disabled:opacity-60"
                                            >
                                                Approve
                                            </button>
                                        ) : (
                                            <span className="text-xs text-gray-500">Published</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {!articles.length ? (
                                <tr>
                                    <td className="px-3 py-8 text-center text-gray-400" colSpan="4">No articles found</td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default ManusControl;