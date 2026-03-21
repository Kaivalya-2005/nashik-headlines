import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle2, Rocket } from 'lucide-react';
import articleService from '../api/articleService';
import toast from 'react-hot-toast';
import { calculateSeoScore, normalizeKeywords, slugify } from '../utils/seoScore';

const EditArticle = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [summary, setSummary] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('draft');
    const [seoTitle, setSeoTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [slug, setSlug] = useState('');
    const [slugEdited, setSlugEdited] = useState(false);
    const [keywords, setKeywords] = useState('');
    const [imageAlt, setImageAlt] = useState('');

    const seoReport = useMemo(() => {
        return calculateSeoScore({
            title,
            seo_title: seoTitle,
            meta_description: metaDescription,
            slug,
            keywords,
            image_alt: imageAlt,
            content,
        });
    }, [title, seoTitle, metaDescription, slug, keywords, imageAlt, content]);

    const scoreTone = seoReport.score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : seoReport.score >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';

    const loadArticle = useCallback(async () => {
        try {
            const data = await articleService.getArticle(id);
            setTitle(data.title || '');
            setContent(data.content || '');
            setSummary(data.summary || '');
            setCategory(data.category || '');
            setStatus(data.status || 'draft');
            setSeoTitle(data.seo_title || data.title || '');
            setMetaDescription(data.meta_description || '');
            setSlug(data.slug || slugify(data.title || ''));
            setKeywords(data.keywords || '');
            setImageAlt(data.image_alt || data.title || '');
        } catch (error) {
            toast.error('Failed to load article');
            console.error(error);
            navigate('/articles');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        loadArticle();
    }, [loadArticle]);

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }

        setSaving(true);
        try {
            await articleService.editArticle(id, {
                title: title.trim(),
                content: content.trim(),
                summary: summary.trim(),
                category: category.trim(),
                seo_title: seoTitle.trim(),
                meta_description: metaDescription.trim(),
                slug: slug.trim() || slugify(title),
                keywords: normalizeKeywords(keywords),
                image_alt: imageAlt.trim(),
                seo_score: seoReport.score,
            });
            toast.success('Article saved successfully');
            loadArticle();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Save failed');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleApprove = async () => {
        setActionLoading(true);
        try {
            await articleService.approveArticle(id);
            toast.success('Article approved');
            setStatus('approved');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Approval failed');
            console.error(error);
        } finally {
            setActionLoading(false);
        }
    };

    const handlePublish = async () => {
        setActionLoading(true);
        try {
            await articleService.publishArticle(id);
            toast.success('Article published');
            setStatus('published');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Publish failed');
            console.error(error);
        } finally {
            setActionLoading(false);
        }
    };


    if (loading) {
        return (
            <div className="p-10 flex justify-center text-gray-500 dark:text-gray-400 dark:bg-slate-900">
                Loading article...
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={() => navigate('/articles')}
                    className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                    <ArrowLeft size={18} className="mr-1" /> Back to Articles
                </button>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                    Status: <span className="font-semibold capitalize">{status}</span>
                </div>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight mb-6 text-slate-900 dark:text-slate-100">Edit Article</h1>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 space-y-6 border border-slate-200 dark:border-slate-800">
                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title *</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => {
                            const value = e.target.value;
                            setTitle(value);
                            if (!slugEdited) {
                                setSlug(slugify(value));
                            }
                        }}
                        className="w-full p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-slate-400/40"
                        placeholder="Article title"
                    />
                </div>

                {/* Content */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Content *</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-64 p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-slate-400/40"
                        placeholder="Article content"
                    />
                </div>

                {/* Summary */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Summary</label>
                    <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full h-20 p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-slate-400/40"
                        placeholder="Brief summary of the article"
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
                    <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-slate-400/40"
                        placeholder="Article category"
                    />
                </div>

                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        disabled
                        className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md opacity-60 cursor-not-allowed"
                    >
                        <option value="draft">Draft</option>
                        <option value="approved">Approved</option>
                        <option value="published">Published</option>
                    </select>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Use action buttons to change status</p>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">SEO Panel</h2>
                        <div className={`text-sm font-semibold ${scoreTone}`}>SEO Score: {seoReport.score} / 100</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">SEO Title (max 60)</label>
                        <input
                            type="text"
                            value={seoTitle}
                            onChange={(e) => setSeoTitle(e.target.value)}
                            maxLength={60}
                            className="w-full p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-slate-400/40"
                            placeholder="Nashik Water Crisis 2026..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Meta Description (150-160)</label>
                        <textarea
                            value={metaDescription}
                            onChange={(e) => setMetaDescription(e.target.value)}
                            maxLength={160}
                            className="w-full h-20 p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-slate-400/40"
                            placeholder="Get the latest updates..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Slug</label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => {
                                setSlugEdited(true);
                                setSlug(slugify(e.target.value));
                            }}
                            className="w-full p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-slate-400/40"
                            placeholder="nashik-water-crisis-2026"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Keywords (comma separated)</label>
                        <input
                            type="text"
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            className="w-full p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-slate-400/40"
                            placeholder="nashik news, water crisis, nashik 2026"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Image Alt Text</label>
                        <input
                            type="text"
                            value={imageAlt}
                            onChange={(e) => setImageAlt(e.target.value)}
                            className="w-full p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-slate-400/40"
                            placeholder="Nashik water shortage 2026 situation"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex gap-4 flex-wrap">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-emerald-700 text-white px-6 py-2 rounded-md hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>

                    {status === 'draft' && (
                        <button
                            onClick={handleApprove}
                            disabled={actionLoading}
                            className="flex items-center gap-2 bg-amber-700 text-white px-6 py-2 rounded-md hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <CheckCircle2 size={18} />
                            {actionLoading ? 'Processing...' : 'Approve'}
                        </button>
                    )}

                    {(status === 'draft' || status === 'approved') && (
                        <button
                            onClick={handlePublish}
                            disabled={actionLoading}
                            className="flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-slate-100 dark:text-slate-900 px-6 py-2 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Rocket size={18} />
                            {actionLoading ? 'Processing...' : 'Publish'}
                        </button>
                    )}

                    <button
                        onClick={() => navigate('/articles')}
                        className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-2 rounded-md hover:bg-slate-300 dark:hover:bg-slate-700"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditArticle;