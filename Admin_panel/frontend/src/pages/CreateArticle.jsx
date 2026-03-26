import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import articleService from '../api/articleService';
import toast from 'react-hot-toast';
import { calculateSeoScore, normalizeKeywords, slugify } from '../utils/seoScore';

const CreateArticle = () => {
    const navigate = useNavigate();
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
    const [creating, setCreating] = useState(false);

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

    const handleTitleChange = (value) => {
        setTitle(value);
        if (!slugEdited) {
            setSlug(slugify(value));
        }
        if (!seoTitle.trim()) {
            setSeoTitle(value);
        }
        if (!imageAlt.trim()) {
            setImageAlt(value);
        }
    };

    const handleCreate = async () => {
        if (!title.trim()) return toast.error('Title is required');
        if (!content.trim()) return toast.error('Content is required');

        setCreating(true);
        try {
            const result = await articleService.createArticle({
                title: title.trim(),
                content: content.trim(),
                summary: summary.trim(),
                category: category.trim(),
                status,
                seo_title: seoTitle.trim(),
                meta_description: metaDescription.trim(),
                slug: slug.trim() || slugify(title),
                keywords: normalizeKeywords(keywords),
                image_alt: imageAlt.trim(),
                seo_score: seoReport.score,
            });
            const newId = result?.id || result?.article?.id;

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
        <div className="max-w-4xl mx-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => navigate('/articles')} className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                    <ArrowLeft size={18} className="mr-1" /> Back to Articles
                </button>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight mb-6 text-slate-900 dark:text-slate-100">Create Article</h1>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 space-y-6 border border-slate-200 dark:border-slate-800">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title *</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className="w-full p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-slate-400/40"
                        placeholder="Enter article title"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Content *</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-64 p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-slate-400/40"
                        placeholder="Enter article content"
                    ></textarea>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Summary</label>
                    <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full h-20 p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-slate-400/40"
                        placeholder="Enter article summary"
                    ></textarea>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
                    <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-slate-400/40"
                        placeholder="Enter article category"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md"
                    >
                        <option value="draft">Draft</option>
                        <option value="approved">Approved</option>
                        <option value="published">Published</option>
                    </select>
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
                            placeholder="Nashik ..."
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
                        ></textarea>
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

                <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="bg-slate-900 dark:bg-slate-100 text-slate-100 dark:text-slate-900 px-6 py-2 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {creating ? 'Creating...' : 'Create Article'}
                    </button>
                    <button
                        onClick={() => navigate('/articles')}
                        className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-2 rounded-md hover:bg-slate-300 dark:hover:bg-slate-700 font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateArticle;
