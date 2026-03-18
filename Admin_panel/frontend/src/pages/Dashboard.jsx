import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import articleService from '../api/articleService';
import agentService from '../api/agentService';
import databaseService from '../api/databaseService';
import StatCard from '../components/StatCard';
import {
    FileText,
    Globe,
    AlertTriangle,
    Plus,
    List,
    Zap,
    Database,
    AlertCircle,
    CheckCircle,
    RefreshCw,
    Clock,
    Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const navigate = useNavigate();
    const refreshIntervalRef = useRef(null);
    const [stats, setStats] = useState({
        total: 0,
        draft: 0,
        published: 0,
        categories: 0
    });
    const [recentArticles, setRecentArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    // System Health & Status
    const [systemHealth, setSystemHealth] = useState({
        llm: null,
        db: null,
        queue: 0,
        scraperEnabled: false,
        lastCheck: null
    });

    // Agent Stats & Queue
    const [agentStats, setAgentStats] = useState({
        rawTotal: 0,
        rawPending: 0,
        rawProcessed: 0,
        articlesTotal: 0,
        articlesDraft: 0,
        articlesPublished: 0,
        queuePending: 0
    });

    // Errors & Monitoring
    const [errors, setErrors] = useState({
        lastError: null,
        failedCount: 0,
        recentLogs: []
    });

    const [actionLoading, setActionLoading] = useState({
        scraper: false,
        pending: false,
        cycle: false,
        refresh: false
    });

    // Initialize dashboard and set up auto-refresh
    useEffect(() => {
        setLoading(true);
        refreshDashboard();

        // Auto-refresh every 5 seconds
        refreshIntervalRef.current = setInterval(() => {
            refreshDashboardQuiet();
        }, 5000);

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, []);

    // Main refresh function with full loading state
    const refreshDashboard = async () => {
        try {
            setLoading(true);
            await Promise.all([
                refreshArticleData(),
                refreshSystemHealth(),
                refreshAgentStats(),
                refreshErrors()
            ]);
        } catch (error) {
            console.error('Dashboard refresh error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Quiet refresh (background, no loading state)
    const refreshDashboardQuiet = async () => {
        try {
            await Promise.all([
                refreshArticleData(),
                refreshSystemHealth(),
                refreshAgentStats(),
                refreshErrors()
            ]);
        } catch (error) {
            console.error('Quiet refresh error:', error);
        }
    };

    // Fetch article statistics
    const refreshArticleData = async () => {
        try {
            const data = await articleService.getArticles(1, 10);
            const articles = data.articles || [];
            const total = data.total ?? articles.length;

            const draftCount = articles.filter(a => 
                a.status?.includes('DRAFT') || a.status === 'draft'
            ).length;
            const publishedCount = articles.filter(a => 
                a.status === 'PUBLISHED' || a.status === 'published'
            ).length;

            setStats({
                total,
                draft: draftCount,
                published: publishedCount,
                categories: 0
            });

            const sorted = [...articles].sort((a, b) => {
                const dateA = new Date(a.created_at || a.createdAt);
                const dateB = new Date(b.created_at || b.createdAt);
                return dateB - dateA;
            });
            setRecentArticles(sorted.slice(0, 5));
        } catch (error) {
            console.error('Failed to refresh article data:', error);
        }
    };

    // Fetch system health (LLM, DB, Scraper)
    const refreshSystemHealth = async () => {
        try {
            const [llmHealth, dbStatus, runtimeConfig] = await Promise.all([
                agentService.getHealthStatus().catch(() => null),
                databaseService.getDatabaseStatus().catch(() => null),
                agentService.getRuntimeConfig().catch(() => null)
            ]);

            setSystemHealth({
                llm: llmHealth?.status === 'healthy' ? 'healthy' : (llmHealth?.status || 'unknown'),
                db: dbStatus?.database ? 'healthy' : 'down',
                queue: 0, // Will be set by agentStats
                scraperEnabled: runtimeConfig?.web_scraper_enabled ?? false,
                lastCheck: new Date()
            });
        } catch (error) {
            console.error('Failed to refresh system health:', error);
        }
    };

    // Fetch agent statistics and queue
    const refreshAgentStats = async () => {
        try {
            const [stats, queue] = await Promise.all([
                agentService.getStats().catch(() => ({})),
                agentService.getQueue(10).catch(() => ({ pending_count: 0 }))
            ]);

            setAgentStats({
                rawTotal: stats.raw_total || 0,
                rawPending: stats.raw_pending || 0,
                rawProcessed: stats.raw_processed || 0,
                articlesTotal: stats.articles_total || 0,
                articlesDraft: stats.articles_draft || 0,
                articlesPublished: stats.articles_published || 0,
                queuePending: queue.pending_count || 0
            });

            // Update queue in system health
            setSystemHealth(prev => ({
                ...prev,
                queue: queue.pending_count || 0
            }));
        } catch (error) {
            console.error('Failed to refresh agent stats:', error);
        }
    };

    // Fetch error logs and memory snapshot
    const refreshErrors = async () => {
        try {
            const memory = await agentService.getMemorySnapshot().catch(() => ({ task_log: [] }));
            
            const logs = memory.task_log || [];
            const errorLogs = logs.filter(log => 
                log.status === 'error' || log.status === 'failed' || log.type === 'error'
            );

            setErrors({
                lastError: errorLogs.length > 0 ? errorLogs[0] : null,
                failedCount: errorLogs.length,
                recentLogs: errorLogs.slice(0, 5)
            });
        } catch (error) {
            console.error('Failed to refresh errors:', error);
            setErrors({ lastError: null, failedCount: 0, recentLogs: [] });
        }
    };

    // Quick action handlers
    const handleRunScraper = async () => {
        try {
            setActionLoading(prev => ({ ...prev, scraper: true }));
            const result = await agentService.runScraperNow();
            toast.success(`Scraper started: ${result.message || 'Running now'}`);
            setTimeout(refreshDashboardQuiet, 1000);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to run scraper');
        } finally {
            setActionLoading(prev => ({ ...prev, scraper: false }));
        }
    };

    const handleProcessPending = async () => {
        try {
            setActionLoading(prev => ({ ...prev, pending: true }));
            const result = await agentService.runPendingQueue(10);
            toast.success(`Processing started: ${result.processed || 0} articles`);
            setTimeout(refreshDashboardQuiet, 1000);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to process pending');
        } finally {
            setActionLoading(prev => ({ ...prev, pending: false }));
        }
    };

    const handleRunFullCycle = async () => {
        try {
            setActionLoading(prev => ({ ...prev, cycle: true }));
            const result = await agentService.runFullCycle(10, true);
            toast.success(`Full cycle started: ${result.message || 'Running'}`);
            setTimeout(refreshDashboardQuiet, 1000);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to run full cycle');
        } finally {
            setActionLoading(prev => ({ ...prev, cycle: false }));
        }
    };

    const handleManualRefresh = async () => {
        try {
            setActionLoading(prev => ({ ...prev, refresh: true }));
            await refreshDashboard();
            toast.success('Dashboard refreshed');
        } catch (error) {
            toast.error('Failed to refresh');
        } finally {
            setActionLoading(prev => ({ ...prev, refresh: false }));
        }
    };

    // Status badge styling
    const getStatusBadge = (status) => {
        const baseClass = 'px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1';
        if (status === 'healthy') return `${baseClass} bg-green-100 text-green-800`;
        if (status === 'down') return `${baseClass} bg-red-100 text-red-800`;
        return `${baseClass} bg-yellow-100 text-yellow-800`;
    };

    const getStatusIcon = (status) => {
        if (status === 'healthy') return <CheckCircle size={14} />;
        if (status === 'down') return <AlertCircle size={14} />;
        return <Clock size={14} />;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header with Title & Controls */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Newsroom Dashboard</h1>
                <div className="space-x-4 flex items-center">
                    <button
                        onClick={handleManualRefresh}
                        disabled={actionLoading.refresh}
                        className="text-gray-600 hover:text-gray-900 font-medium inline-flex items-center gap-2"
                    >
                        <RefreshCw size={18} className={actionLoading.refresh ? 'animate-spin' : ''} /> 
                        Refresh
                    </button>
                    <button
                        onClick={() => navigate('/articles')}
                        className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                        View All
                    </button>
                    <button
                        onClick={() => navigate('/articles/create')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center inline-flex"
                    >
                        <Plus size={18} className="mr-2" /> New Article
                    </button>
                </div>
            </div>

            {/* System Status Card - At-a-Glance Health */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Activity size={20} className="text-blue-600" /> System Status
                    </h2>
                    <span className="text-xs text-gray-500">
                        Last updated: {systemHealth.lastCheck ? systemHealth.lastCheck.toLocaleTimeString() : 'Never'}
                    </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* LLM Status */}
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <div className="text-xs text-gray-600 mb-2 font-medium">LLM</div>
                        <div className={getStatusBadge(systemHealth.llm)}>
                            {getStatusIcon(systemHealth.llm)}
                            {systemHealth.llm === 'healthy' ? 'Running (Mistral)' : 'Offline'}
                        </div>
                    </div>

                    {/* DB Status */}
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <div className="text-xs text-gray-600 mb-2 font-medium">Database</div>
                        <div className={getStatusBadge(systemHealth.db)}>
                            {getStatusIcon(systemHealth.db)}
                            {systemHealth.db === 'healthy' ? 'Connected' : 'Disconnected'}
                        </div>
                    </div>

                    {/* Queue Pending */}
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <div className="text-xs text-gray-600 mb-2 font-medium">Queue</div>
                        <div className="text-2xl font-bold text-orange-600">{agentStats.queuePending}</div>
                        <div className="text-xs text-gray-500">Pending items</div>
                    </div>

                    {/* Scraper Status */}
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <div className="text-xs text-gray-600 mb-2 font-medium">Scraper</div>
                        <div className={getStatusBadge(systemHealth.scraperEnabled ? 'healthy' : 'down')}>
                            {getStatusIcon(systemHealth.scraperEnabled ? 'healthy' : 'down')}
                            {systemHealth.scraperEnabled ? 'Enabled' : 'Disabled'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions - ONE-CLICK OPERATIONS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Zap size={20} className="text-amber-600" /> Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={handleRunScraper}
                        disabled={actionLoading.scraper || !systemHealth.scraperEnabled}
                        className="bg-blue-50 hover:bg-blue-100 disabled:bg-gray-100 border border-blue-200 disabled:border-gray-200 rounded-lg p-4 text-left transition-colors group"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Globe size={20} className="text-blue-600 group-disabled:text-gray-400" />
                            <span className="font-semibold text-gray-900 group-disabled:text-gray-500">Run Scraper</span>
                        </div>
                        <p className="text-xs text-gray-600">Fetch new articles from sources</p>
                        {actionLoading.scraper && <div className="mt-2 text-xs text-blue-600">Running...</div>}
                    </button>

                    <button
                        onClick={handleProcessPending}
                        disabled={actionLoading.pending || agentStats.queuePending === 0}
                        className="bg-green-50 hover:bg-green-100 disabled:bg-gray-100 border border-green-200 disabled:border-gray-200 rounded-lg p-4 text-left transition-colors group"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Zap size={20} className="text-green-600 group-disabled:text-gray-400" />
                            <span className="font-semibold text-gray-900 group-disabled:text-gray-500">Process Pending</span>
                        </div>
                        <p className="text-xs text-gray-600">{agentStats.queuePending} items waiting</p>
                        {actionLoading.pending && <div className="mt-2 text-xs text-green-600">Processing...</div>}
                    </button>

                    <button
                        onClick={handleRunFullCycle}
                        disabled={actionLoading.cycle}
                        className="bg-purple-50 hover:bg-purple-100 disabled:bg-gray-100 border border-purple-200 disabled:border-gray-200 rounded-lg p-4 text-left transition-colors group"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Activity size={20} className="text-purple-600 group-disabled:text-gray-400" />
                            <span className="font-semibold text-gray-900 group-disabled:text-gray-500">Full Cycle</span>
                        </div>
                        <p className="text-xs text-gray-600">Scrape + Process all pending</p>
                        {actionLoading.cycle && <div className="mt-2 text-xs text-purple-600">Running...</div>}
                    </button>
                </div>
            </div>

            {/* Error Visibility Panel - CRITICAL FOR DEBUGGING */}
            {errors.failedCount > 0 && (
                <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                    <h2 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                        <AlertCircle size={20} /> System Errors ({errors.failedCount})
                    </h2>
                    <div className="space-y-4">
                        {errors.lastError && (
                            <div className="bg-white rounded-lg p-4 border-l-4 border-red-400">
                                <div className="font-semibold text-gray-900 mb-2">Last Error</div>
                                <p className="text-sm text-gray-600 mb-2">
                                    {errors.lastError.message || errors.lastError.error || JSON.stringify(errors.lastError).substring(0, 100)}
                                </p>
                                {errors.lastError.timestamp && (
                                    <div className="text-xs text-gray-500">
                                        {new Date(errors.lastError.timestamp).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        )}
                        {errors.recentLogs.length > 0 && (
                            <div className="bg-white rounded-lg p-4 border border-gray-100">
                                <div className="font-semibold text-gray-900 mb-3">Recent Error Logs</div>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {errors.recentLogs.slice(1).map((log, i) => (
                                        <div key={i} className="text-xs text-gray-600 pb-2 border-b border-gray-100 last:border-0">
                                            {log.message || log.error || log.type}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <Link 
                            to="/manus-control" 
                            className="text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                            → View full error logs in Manus Control
                        </Link>
                    </div>
                </div>
            )}

            {/* Agent & Raw Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Raw Articles Stats */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Raw Articles (Pipeline)</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                            <span className="text-gray-700">Total Scraped</span>
                            <span className="text-2xl font-bold text-gray-900">{agentStats.rawTotal}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                            <span className="text-gray-700">Pending Processing</span>
                            <span className="text-2xl font-bold text-orange-600">{agentStats.rawPending}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                            <span className="text-gray-700">Processed</span>
                            <span className="text-2xl font-bold text-green-600">{agentStats.rawProcessed}</span>
                        </div>
                    </div>
                </div>

                {/* Published Articles Stats */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Published Articles</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                            <span className="text-gray-700">Total Articles</span>
                            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                            <span className="text-gray-700">Published Live</span>
                            <span className="text-2xl font-bold text-green-600">{stats.published}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700">In Draft</span>
                            <span className="text-2xl font-bold text-yellow-600">{stats.draft}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Article Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Articles"
                    value={stats.total}
                    icon={FileText}
                    color="bg-indigo-500"
                    subtext="All time"
                />
                <StatCard
                    title="Published"
                    value={stats.published}
                    icon={Globe}
                    color="bg-green-500"
                    subtext="Live articles"
                />
                <StatCard
                    title="Drafts"
                    value={stats.draft}
                    icon={List}
                    color="bg-yellow-500"
                    subtext="Not yet reviewed"
                />
                <StatCard
                    title="In Queue"
                    value={agentStats.queuePending}
                    icon={Clock}
                    color="bg-orange-500"
                    subtext="Waiting to process"
                />
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-700">Recent Activity</h3>
                    <Link to="/articles" className="text-sm text-blue-600 hover:underline">See all activity</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 uppercase text-xs font-semibold text-gray-500 border-b">
                            <tr>
                                <th className="px-6 py-3">Article Title</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentArticles.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                                        {loading ? 'Loading articles...' : 'No recent activity'}
                                    </td>
                                </tr>
                            ) : (
                                recentArticles.map((article) => (
                                    <tr key={article.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-xs">{article.title}</td>
                                        <td className="px-6 py-4">{new Date(article.created_at || article.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                                ${article.status === 'PUBLISHED' || article.status === 'published' ? 'bg-green-100 text-green-800' :
                                                    article.status?.includes('DRAFT') || article.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                                {article.status?.replace('_', ' ') || 'draft'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                to={`/articles/edit/${article.id}`}
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                Edit
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
