import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import aiService from '../api/aiService';
import toast from 'react-hot-toast';

const CreateArticle = () => {
    const navigate = useNavigate();
    const [topic, setTopic] = useState('');
    const [category, setCategory] = useState('');
    const [tone, setTone] = useState('');
    const [articleLength, setArticleLength] = useState('');
    const [generating, setGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!topic.trim() || !category.trim()) return toast.error('Topic and category are required');

        setGenerating(true);
        try {
            const payload = { topic, category, tone, length: articleLength };
            const result = await aiService.generateArticle(payload);
            const newId = result?.id || result?.articleId || result?.article?.id;

            if (!newId) {
                toast.error('No article id returned from AI');
                return;
            }

            toast.success('Draft generated');
            navigate(`/articles/edit/${newId}`);
        } catch (error) {
            const msg = error.response?.data?.message || 'Generation failed';
            toast.error(msg, { duration: 5000 });
        } finally {
            setGenerating(false);
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                    <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Enter the news topic"
                    ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full p-2 border rounded-lg text-gray-900"
                            placeholder="e.g., Politics"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                        <input
                            type="text"
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            className="w-full p-2 border rounded-lg text-gray-900"
                            placeholder="e.g., Neutral, Informative"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Article Length</label>
                    <input
                        type="text"
                        value={articleLength}
                        onChange={(e) => setArticleLength(e.target.value)}
                        className="w-full p-2 border rounded-lg text-gray-900"
                        placeholder="e.g., 600 words"
                    />
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full flex items-center justify-center bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                    {generating ? 'Generating...' : <><Sparkles className="mr-2" /> Generate Article</>}
                </button>
            </div>
        </div>
    );
};

export default CreateArticle;
