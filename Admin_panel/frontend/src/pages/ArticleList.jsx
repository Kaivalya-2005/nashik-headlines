import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Globe, ExternalLink } from 'lucide-react';
import articleService from '../services/articleService';
import toast from 'react-hot-toast';

const ArticleList = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pushingId, setPushingId] = useState(null);

    useEffect(() => {
        fetchArticles();
    }, [page]);

    const fetchArticles = async () => {
        setLoading(true);
        try {
            const data = await articleService.getAll(page);
            setArticles(data.articles || []);
            setTotalPages(Number(data.pages) || 1);
        } catch (error) {
            toast.error('Failed to load articles');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this article?')) return;
        try {
            await articleService.remove(id);
            toast.success('Article deleted');
            fetchArticles();
        } catch (error) {
            toast.error('Failed to delete article');
        }
    };

    const handlePushToWP = async (id) => {
        if (!window.confirm('Push to WordPress as Draft?')) return;
        setPushingId(id);
        try {
            const result = await articleService.pushToWordPress(id);
            toast.success('Pushed to WordPress!');
            // Update local state to reflect changes
            setArticles(articles.map(a =>
                a._id === id ? { ...a, status: 'DRAFT_WP', wpId: result.wpId, wpUrl: result.wpUrl } : a
            ));
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to push to WP');
        } finally {
            setPushingId(null);
        }
    };

    if (loading && articles.length === 0) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Articles</h1>
                <Link
                    to="/articles/create"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Create New
                </Link>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {articles.map((article) => (
                            <tr key={article._id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{article.title}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${article.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                                        article.status === 'DRAFT_WP' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                        {article.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(article.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    {article.wpUrl && (
                                        <a href={article.wpUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900 inline-block" title="View WP Draft">
                                            <ExternalLink size={18} />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handlePushToWP(article._id)}
                                        disabled={pushingId === article._id || article.status === 'PUBLISHED'}
                                        className={`text-blue-600 hover:text-blue-900 disabled:opacity-50 ${pushingId === article._id ? 'animate-pulse' : ''}`}
                                        title="Push to WordPress"
                                    >
                                        <Globe size={18} />
                                    </button>
                                    <Link to={`/articles/edit/${article._id}`} className="text-amber-600 hover:text-amber-900 inline-block">
                                        <Edit size={18} />
                                    </Link>
                                    <button onClick={() => handleDelete(article._id)} className="text-red-600 hover:text-red-900">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Simple Pagination */}
            {/* Enhanced Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="text-sm text-gray-500">
                        Page <span className="font-semibold text-gray-800">{page}</span> of <span className="font-semibold text-gray-800">{totalPages}</span>
                    </div>

                    <div className="space-x-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${page === 1
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                                }`}
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${page >= totalPages
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                }`}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArticleList;
