import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import articleService from '../api/articleService';
import toast from 'react-hot-toast';

const CreateArticle = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [status, setStatus] = useState('DRAFT');
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        if (!title.trim()) return toast.error('Title is required');
        if (!content.trim()) return toast.error('Content is required');

        setCreating(true);
        try {
            const result = await articleService.createArticle({ 
                title: title.trim(), 
                content: content.trim(),
                status 
            });
            const newId = result?.article?.id || result?.id;

            if (!newId) {
                toast.error('No article id returned');
                return;
            }

            toast.success('Article created');
            navigate(`/articles/edit/${newId}`);
        } catch (error) {
            const msg = error.response?.data?.message || 'Creation failed';
            toast.error(msg, { duration: 5000 });
            console.error(error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <button onClick={() => navigate('/articles')} className="flex items-center text-gray-500 hover:text-gray-700 mb-4">
                <ArrowLeft size={18} className="mr-1" /> Back to Articles
            </button>

            <h1 className="text-2xl font-bold mb-6 text-gray-800">Create New Article</h1>

            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Enter article title"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content *</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-64 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Enter article content"
                    ></textarea>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full p-2 border rounded-lg text-gray-900"
                    >
                        <option value="DRAFT">Draft</option>
                        <option value="DRAFT_EDITED">Draft (Edited)</option>
                        <option value="DRAFT_WP">Draft (WordPress)</option>
                        <option value="PUBLISHED">Published</option>
                    </select>
                </div>

                <div className="flex gap-4 pt-4">
                    <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {creating ? 'Creating...' : 'Create Article'}
                    </button>
                    <button
                        onClick={() => navigate('/articles')}
                        className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateArticle;
