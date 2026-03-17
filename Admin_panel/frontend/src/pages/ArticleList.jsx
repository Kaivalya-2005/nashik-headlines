import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, CheckCircle2, Ban, Rocket } from 'lucide-react';
import articleService from '../api/articleService';
import toast from 'react-hot-toast';

const ArticleList = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [actionId, setActionId] = useState(null);

    useEffect(() => {
        fetchArticles();
    }, [page]);

    const fetchArticles = async () => {
        setLoading(true);
        try {
            const data = await articleService.getArticles(page, 10);
            setArticles(data.articles || []);
            setTotalPages(data.pages || 1);
        } catch (error) {
            toast.error('Failed to load articles');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatusLocal = (id, status) => {
        setArticles(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this article?')) return;
        
        setActionId(id);
        try {
            await articleService.deleteArticle(id);
            setArticles(prev => prev.filter(a => a.id !== id));
            toast.success('Article deleted');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Delete failed');
        } finally {
            setActionId(null);
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {articles.map((article) => (
                            <tr key={article.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{article.title}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {article.source_name || '—'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        article.status === 'PUBLISHED' || article.status === 'published'
                                            ? 'bg-green-100 text-green-800'
                                            : article.status?.includes('DRAFT')
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {article.status?.replace('_', ' ') || 'DRAFT'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {article.created_at ? new Date(article.created_at).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button
                                        onClick={() => handleDelete(article.id)}
                                        disabled={actionId === article.id}
                                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                        title="Delete"
                                    >
                                        <Ban size={18} />
                                    </button>
                                    <Link to={`/articles/edit/${article.id}`} className="text-amber-600 hover:text-amber-900 inline-block">
                                        <Edit size={18} />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Simple Pagination */}
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
