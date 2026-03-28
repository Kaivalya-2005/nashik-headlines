import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, Wand2, AlignCenter, ImagePlus } from 'lucide-react';
import articleService from '../api/articleService';
import aiService from '../api/aiService';
import toast from 'react-hot-toast';
import ImageUpload from '../components/ImageUpload';

const EditArticle = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [seo, setSEO] = useState({ metaTitle: '', metaDescription: '', keywords: [] });
    const [images, setImages] = useState([]);
    const [imagePrompt, setImagePrompt] = useState('');

    useEffect(() => {
        loadArticle();
    }, [id]);

    const loadArticle = async () => {
        try {
            const data = await articleService.getArticle(id);
            setArticle(data);
            setTitle(data.title || '');
            setSummary(data.summary || '');
            setContent(data.content || '');
            setCategory(data.category || '');
            setTagsInput((data.tags || []).join(', '));
            setSEO({
                metaTitle: data.seo?.metaTitle || '',
                metaDescription: data.seo?.metaDescription || '',
                keywords: data.seo?.keywords || []
            });
            const normalizedImages = (data.images || []).map((img, idx) => ({
                ...img,
                id: img.id || `${idx}-${img.url || 'image'}`
            }));
            setImages(normalizedImages);
        } catch (error) {
            toast.error('Failed to load article');
            navigate('/articles');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setProcessing(true);
        try {
            const newFiles = images.filter(img => img.file);
            let currentImages = images;

            if (newFiles.length > 0) {
                const formData = new FormData();
                newFiles.forEach(img => formData.append('images', img.file));
                currentImages = await articleService.uploadImages(id, formData);
                currentImages = (currentImages || []).map((img, idx) => ({
                    ...img,
                    id: img.id || `${idx}-${img.url || 'image'}`
                }));
                setImages(currentImages);
            }

            const payload = {
                title,
                summary,
                content,
                category,
                tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
                seo_title: seo.metaTitle,
                meta_description: seo.metaDescription,
                keywords: seo.keywords,
                images: currentImages.map(img => ({
                    id: img.id,
                    url: img.url,
                    caption: img.caption,
                    altText: img.altText,
                    isFeatured: img.isFeatured
                }))
            };

            const updated = await articleService.updateArticle(id, payload);
            toast.success('Saved successfully');
            const normalized = (updated.images || []).map((img, idx) => ({
                ...img,
                id: img.id || `${idx}-${img.url || 'image'}`
            }));
            setArticle(updated);
            setImages(normalized);
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to save changes.';
            toast.error(msg, { duration: 5000 });
        } finally {
            setProcessing(false);
        }
    };

    const handleRewrite = async () => {
        setProcessing(true);
        try {
            const result = await aiService.rewriteArticle(id);
            setContent(result.content || content);
            toast.success('Article rewritten');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Rewrite failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateSummary = async () => {
        setProcessing(true);
        try {
            const result = await aiService.summarizeArticle(id);
            setSummary(result.summary || '');
            toast.success('Summary generated');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Summary failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateSEO = async () => {
        setProcessing(true);
        try {
            const result = await aiService.generateSEO(id);
            setSEO({
                metaTitle: result.seoData?.seo_title || seo.metaTitle,
                metaDescription: result.seoData?.meta_description || seo.metaDescription,
                keywords: result.seoData?.keywords || seo.keywords || []
            });
            toast.success('SEO metadata generated');
        } catch (error) {
            toast.error(error.response?.data?.message || 'SEO generation failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateTags = async () => {
        setProcessing(true);
        try {
            const result = await aiService.generateTags(id);
            const tags = result.tags || '';
            setTagsInput(typeof tags === 'string' ? tags : tags.join(', '));
            toast.success('Tags generated');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Tag generation failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateImagePrompt = async () => {
        setProcessing(true);
        try {
            const result = await aiService.generateImagePrompt(id);
            setImagePrompt(result.prompt || '');
            toast.success('Image prompt generated');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Image prompt failed');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center mb-4">
                    <button onClick={() => navigate('/articles')} className="text-gray-500 hover:text-gray-700 mr-4">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Edit Article</h1>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Article Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 border rounded-lg text-lg font-semibold text-gray-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                        <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            className="w-full h-28 p-3 border rounded-lg text-gray-900 bg-gray-50 focus:bg-white"
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">HTML Content</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full h-[420px] p-4 border rounded-lg font-mono text-sm text-gray-900 bg-gray-50 focus:bg-white transition-colors"
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
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                            <input
                                type="text"
                                value={tagsInput}
                                onChange={(e) => setTagsInput(e.target.value)}
                                className="w-full p-2 border rounded-lg text-gray-900"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={processing}
                        className="flex items-center bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                        <Save size={18} className="mr-2" /> Save Changes
                    </button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold">Article Images</h3>
                        {imagePrompt && (
                            <span className="text-xs text-gray-500 truncate max-w-xs" title={imagePrompt}>Prompt: {imagePrompt}</span>
                        )}
                    </div>
                    <ImageUpload
                        images={images}
                        onImagesChange={setImages}
                        maxImages={3}
                        articleId={id}
                    />
                </div>
            </div>

            <div className="space-y-6 lg:mt-12">
                <div className="bg-white p-6 rounded-lg shadow-sm space-y-3">
                    <h3 className="text-lg font-bold mb-2 flex items-center text-purple-700">
                        <Sparkles size={18} className="mr-2" /> AI Actions
                    </h3>
                    <button
                        onClick={handleRewrite}
                        disabled={processing}
                        className="w-full flex items-center justify-center p-2 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 font-medium transition-colors"
                    >
                        <Wand2 size={16} className="mr-2" /> Rewrite Article
                    </button>
                    <button
                        onClick={handleGenerateSummary}
                        disabled={processing}
                        className="w-full flex items-center justify-center p-2 border border-gray-200 rounded hover:bg-gray-50 text-gray-700 font-medium transition-colors"
                    >
                        <AlignCenter size={16} className="mr-2" /> Generate Summary
                    </button>
                    <button
                        onClick={handleGenerateSEO}
                        disabled={processing}
                        className="w-full flex items-center justify-center p-2 border border-gray-200 rounded hover:bg-gray-50 text-gray-700 font-medium transition-colors"
                    >
                        <Sparkles size={16} className="mr-2" /> Generate SEO
                    </button>
                    <button
                        onClick={handleGenerateTags}
                        disabled={processing}
                        className="w-full flex items-center justify-center p-2 border border-gray-200 rounded hover:bg-gray-50 text-gray-700 font-medium transition-colors"
                    >
                        <Sparkles size={16} className="mr-2" /> Generate Tags
                    </button>
                    <button
                        onClick={handleGenerateImagePrompt}
                        disabled={processing}
                        className="w-full flex items-center justify-center p-2 border border-gray-200 rounded hover:bg-gray-50 text-gray-700 font-medium transition-colors"
                    >
                        <ImagePlus size={16} className="mr-2" /> Generate Image Prompt
                    </button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
                    <h3 className="text-lg font-bold flex items-center">
                        <Sparkles size={18} className="mr-2 text-blue-500" /> SEO Metadata
                    </h3>

                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">Meta Title</label>
                        <p className="text-sm text-gray-800">{seo.metaTitle || 'Not set'}</p>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">Meta Description</label>
                        <p className="text-sm text-gray-600 line-clamp-3">{seo.metaDescription || 'Not set'}</p>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">Keywords</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {(seo.keywords || []).map((k, i) => (
                                <span key={i} className="text-xs bg-gray-100 text-gray-800 border border-gray-200 px-2 py-1 rounded">{k}</span>
                            ))}
                            {(seo.keywords || []).length === 0 && <span className="text-sm text-gray-400">None</span>}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                        <p className="text-sm font-semibold capitalize">{article.status || 'draft'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditArticle;
