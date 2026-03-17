import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import articleService from '../api/articleService';
import StatCard from '../components/StatCard';
import {
    FileText,
    Globe,
    AlertTriangle,
    Plus,
    List
} from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total: 0,
        draft: 0,
        published: 0,
        categories: 0
    });
    const [recentArticles, setRecentArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const data = await articleService.getArticles(1, 10);

            const articles = data.articles || [];
            const total = data.total ?? articles.length;

            // Count by status - handle both old and new field names
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

            // Sort by created_at or createdAt
            const sorted = [...articles].sort((a, b) => {
                const dateA = new Date(a.created_at || a.createdAt);
                const dateB = new Date(b.created_at || b.createdAt);
                return dateB - dateA;
            });
            setRecentArticles(sorted.slice(0, 5));
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
                    title="Categories"
                    value={stats.categories}
                    icon={AlertTriangle}
                    color="bg-purple-500"
                    subtext="Unique categories"
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
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400">No recent activity</td>
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
