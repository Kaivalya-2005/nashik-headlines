import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import articleService from '../services/articleService';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import {
    FileText,
    Globe,
    Cpu,
    AlertTriangle,
    Plus,
    List
} from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total: 0,
        recentCount: 0,
        processingCount: 0,
        failedCount: 0,
        publishedRecent: 0,
        draftRecent: 0
    });
    const [recentArticles, setRecentArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            // Fetch first page (most recent 10)
            const data = await articleService.getAll(1);

            const articles = data.articles || [];
            const total = data.total || 0;

            // Calculate Stats from RECENT items (limitation: API doesn't give global stats per status)
            const processingCount = articles.filter(a => a.generationStatus === 'PROCESSING' || a.generationStatus === 'PENDING').length;
            const failedCount = articles.filter(a => a.generationStatus === 'FAILED').length;
            const publishedRecent = articles.filter(a => a.status === 'PUBLISHED').length;
            const draftRecent = articles.filter(a => a.status.includes('DRAFT')).length;

            setStats({
                total,
                recentCount: articles.length,
                processingCount,
                failedCount,
                publishedRecent,
                draftRecent
            });

            setRecentArticles(articles.slice(0, 5)); // Top 5
        } catch (error) {
            console.error(error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-10 flex justify-center text-gray-500">Loading Dashboard...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Newsroom Dashboard</h1>
                <div className="space-x-4">
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

            {/* AI Failure Alert */}
            {stats.failedCount > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r shadow-sm">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">
                                <span className="font-bold">Attention Needed:</span> {stats.failedCount} recent AI jobs failed. Check the failed articles to retry.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Articles"
                    value={stats.total}
                    icon={FileText}
                    color="bg-indigo-500"
                    subtext="All time"
                />
                <StatCard
                    title="Published (Recent)"
                    value={stats.publishedRecent}
                    icon={Globe}
                    color="bg-green-500"
                    subtext="Using recent data snapshot"
                />
                <StatCard
                    title="Drafts (Recent)"
                    value={stats.draftRecent}
                    icon={List}
                    color="bg-yellow-500"
                    subtext="Local & WP Drafts"
                />
                <StatCard
                    title="AI Processing"
                    value={stats.processingCount}
                    icon={Cpu}
                    color={stats.processingCount > 0 ? "bg-purple-600 animate-pulse" : "bg-purple-500"}
                    subtext="Active Jobs"
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
                                <th className="px-6 py-3">AI Status</th>
                                <th className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentArticles.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400">No recent activity</td>
                                </tr>
                            ) : (
                                recentArticles.map((article) => (
                                    <tr key={article._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-xs">{article.title}</td>
                                        <td className="px-6 py-4">{new Date(article.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                                ${article.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                                                    article.status === 'DRAFT_WP' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                                {article.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {article.generationStatus ? (
                                                <StatusBadge status={article.generationStatus} error={article.generationError} />
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                to={`/articles/edit/${article._id}`}
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
