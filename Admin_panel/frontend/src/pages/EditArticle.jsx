import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, ImagePlus } from 'lucide-react';
import articleService from '../api/articleService';
import toast from 'react-hot-toast';

const EditArticle = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);

    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [content, setContent] = useState('');
    const [summary, setSummary] = useState('');
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');
    const [status, setStatus] = useState('DRAFT');
    const [images, setImages] = useState([]);

    useEffect(() => {
        loadArticle();
    }, [id]);

    const loadArticle = async () => {
        try {
            const data = await articleService.getArticle(id);
            setArticle(data);
            setTitle(data.title || '');
            setSubtitle(data.subtitle || '');
            setContent(data.content || '');
            setSummary(data.summary || '');
            setSeoTitle(data.seo_title || '');
            setSeoDescription(data.seo_description || '');
            setStatus(data.status || 'DRAFT');
            setImages(data.images || []);
        } catch (error) {
            toast.error('Failed to load article');
            console.error(error);
            navigate('/articles');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }

        setSaving(true);
        try {
            await articleService.updateArticle(id, {
                title: title.trim(),
                subtitle: subtitle.trim(),
                content: content.trim(),
                summary: summary.trim(),
                seo_title: seoTitle.trim(),
                seo_description: seoDescription.trim(),
                status
            });
            toast.success('Article saved successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Save failed');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateContent = async () => {
        setGenerating(true);
        try {
            const result = await articleService.generateContent(id);
            if (result.article) {
                setTitle(result.article.title || title);
                setSubtitle(result.article.subtitle || subtitle);
                setContent(result.article.content || content);
                setSummary(result.article.summary || summary);
                setSeoTitle(result.article.seo_title || seoTitle);
                setSeoDescription(result.article.seo_description || seoDescription);
            }
            toast.success('Content generated successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Generation failed');
            console.error(error);
        } finally {
            setGenerating(false);
        }
    };

    const handleAnalyzeSEO = async () => {
        try {
            const result = await articleService.analyzeSEO(id);
            toast.success(`SEO Score: ${result.seoScore || result.score || 0}/100`);
        } catch (error) {
            toast.error('SEO analysis failed');
            console.error(error);
        }
    };

    const handleUploadImages = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        try {
            const result = await articleService.uploadImages(id, files);
            if (result.images) {
                setImages(result.images);
                toast.success('Images uploaded successfully');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Image upload failed');
            console.error(error);
        }
    };

    if (loading) {
        return (
            <div className="p-10 flex justify-center text-gray-500">
                Loading article...
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <button
                onClick={() => navigate('/articles')}
                className="flex items-center text-gray-500 hover:text-gray-700 mb-4"
            >
                <ArrowLeft size={18} className="mr-1" /> Back to Articles
            </button>

            <h1 className="text-3xl font-bold mb-6 text-gray-800">Edit Article</h1>

            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Article title"
                    />
                </div>

                {/* Subtitle */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
                    <input
                        type="text"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Article subtitle"
                    />
                </div>

                {/* Content */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-64 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Article content"
                    />
                </div>

                {/* Summary */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Summary</label>
                    <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full h-20 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Brief summary of the article"
                    />
                </div>

                {/* SEO Section */}
                <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">SEO Settings</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                            <input
                                type="text"
                                value={seoTitle}
                                onChange={(e) => setSeoTitle(e.target.value)}
                                maxLength="60"
                                className="w-full p-3 border rounded-lg text-gray-900"
                                placeholder="SEO title (max 60 characters)"
                            />
                            <p className="text-xs text-gray-500 mt-1">{seoTitle.length}/60</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                            <textarea
                                value={seoDescription}
                                onChange={(e) => setSeoDescription(e.target.value)}
                                maxLength="160"
                                rows="2"
                                className="w-full p-3 border rounded-lg text-gray-900"
                                placeholder="SEO description (max 160 characters)"
                            />
                            <p className="text-xs text-gray-500 mt-1">{seoDescription.length}/160</p>
                        </div>
                    </div>
                </div>

                {/* Status */}
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

                {/* Images */}
                <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Images</h3>
                    <div className="mb-4">
                        <label className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 w-fit">
                            <ImagePlus size={18} />
                            <span>Upload Images</span>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleUploadImages}
                                className="hidden"
                            />
                        </label>
                    </div>
                    {images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative group">
                                    <img
                                        src={img.url}
                                        alt="Article"
                                        className="w-full h-40 object-cover rounded-lg"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="border-t pt-6 flex gap-4 flex-wrap">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Article'}
                    </button>

                    <button
                        onClick={handleGenerateContent}
                        disabled={generating}
                        className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                        <Sparkles size={18} />
                        {generating ? 'Generating...' : 'Generate Content'}
                    </button>

                    <button
                        onClick={handleAnalyzeSEO}
                        className="flex items-center gap-2 bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
                    >
                        Analyze SEO
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

export default EditArticle;

