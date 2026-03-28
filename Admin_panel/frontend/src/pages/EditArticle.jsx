import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, Wand2, AlignCenter, ImagePlus, RefreshCw, XCircle, CheckCircle, Rocket } from 'lucide-react';
import articleService from '../api/articleService';
import aiService from '../api/aiService';
import * as newsroomService from '../services/newsroomService';
import toast from 'react-hot-toast';
import ImageUpload from '../components/ImageUpload';

const EditArticle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [aiStatus, setAiStatus] = useState({});

    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [seo, setSEO] = useState({ metaTitle: '', metaDescription: '', keywords: [], slug: '', imageAlt: '' });
    const [images, setImages] = useState([]);
    const [imagePrompt, setImagePrompt] = useState('');

    // Score state — updated on load and after AI regeneration
    const [seoScore, setSeoScore] = useState(null);
    const [qualityScore, setQualityScore] = useState(null);
    const [readabilityScore, setReadabilityScore] = useState(null);
    const [aiConfidence, setAiConfidence] = useState(null);

    useEffect(() => {
        loadArticle();
    }, [id]);

    useEffect(() => {
        if (location.state?.focusSeo && !loading) {
            setTimeout(() => {
                const seoElement = document.getElementById('seo-panel');
                if (seoElement) {
                    seoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    seoElement.classList.add('ring-2', 'ring-indigo-500', 'transition-all', 'duration-500');
                    setTimeout(() => seoElement.classList.remove('ring-2', 'ring-indigo-500'), 2000);
                }
            }, 600);
            
            // Clear the state so it doesn't run again if the component re-renders
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, loading, navigate, location.pathname]);

    const loadArticle = async () => {
        try {
            const data = await articleService.getArticle(id);
            setArticle(data);
            setTitle(data.title || '');
            setSummary(data.summary || '');
            setContent(data.content || '');
            setCategory(data.category || '');
            // tags comes from DB as a comma-separated string already; handle both string and array
            const rawTags = data.tags || '';
            setTagsInput(Array.isArray(rawTags) ? rawTags.join(', ') : rawTags);
            // Initialise scores from DB
            setSeoScore(data.seo_score ?? null);
            setQualityScore(data.quality_score ?? null);
            setReadabilityScore(data.readability_score ?? null);
            setAiConfidence(data.ai_confidence ?? null);
            setSEO({
                metaTitle: data.seo?.metaTitle || data.seo_title || '',
                metaDescription: data.seo?.metaDescription || data.meta_description || '',
                keywords: data.seo?.keywords || data.keywords || [],
                slug: data.slug || '',
                imageAlt: data.image_alt || ''
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
        console.log('[handleSave] Saving article id:', id);
        setProcessing(true);
        try {
            const newFiles = images.filter(img => img.file);
            let currentImages = images;

            if (newFiles.length > 0) {
                try {
                    const formData = new FormData();
                    newFiles.forEach(img => formData.append('images', img.file));
                    const uploaded = await articleService.uploadImages(id, formData);
                    currentImages = (uploaded || []).map((img, idx) => ({
                        ...img,
                        id: img.id || `${idx}-${img.url || 'image'}`
                    }));
                    setImages(currentImages);
                } catch (imgErr) {
                    toast.error('Image upload failed — saving article without new images.');
                }
            }

            // Send flat SEO fields the backend reads, plus nested seo for compatibility
            const payload = {
                title,
                summary,
                content,
                category,
                // Send tags exactly as the user typed — backend stores as a comma-separated string
                tags: tagsInput,
                seo_title: seo.metaTitle || '',
                meta_description: seo.metaDescription || '',
                slug: seo.slug || '',
                image_alt: seo.imageAlt || '',
                keywords: Array.isArray(seo.keywords) ? seo.keywords.join(', ') : (seo.keywords || ''),
                seo,
                images: currentImages.map(img => ({
                    id: img.id,
                    url: img.url,
                    caption: img.caption,
                    altText: img.altText,
                    isFeatured: img.isFeatured
                }))
            };

            const updated = await articleService.updateArticle(id, payload);
            navigate('/articles', { state: { saved: true } });
        } catch (error) {
            const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to save changes.';
            toast.error(msg, { duration: 5000 });
        } finally {
            setProcessing(false);
        }
    };

    const handleAction = async (actionFunction, successMsg) => {
        setProcessing(true);
        try {
            await actionFunction(id);
            toast.success(successMsg);
            navigate('/articles');
        } catch (error) {
            toast.error(error.message || 'Action failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleRegenerate = async () => {
        if (processing) return;

        console.log('[Regenerate] Button clicked — title len:', title?.length, '| content len:', content?.length);

        // Step 1: Waiting state — give the UI a moment to render before the async call
        setProcessing(true);
        setAiStatus(prev => ({...prev, regenerate: 'waiting', regenerateMsg: 'Preparing AI regeneration...'}));

        // Brief pause so the "Waiting" status is visible to the user
        await new Promise(resolve => setTimeout(resolve, 600));

        // Step 2: Processing state — actual API call begins
        setAiStatus(prev => ({...prev, regenerate: 'processing', regenerateMsg: 'AI is regenerating the article...'}));

        try {
            console.log('[Regenerate] Sending POST /api/articles/regenerate...');
            const result = await aiService.regenerateArticle({ title, content });
            console.log('[Regenerate] Response received:', result);

            // Update all editor fields with regenerated data
            setTitle(result.title || title);
            setContent(result.content || content);
            setCategory(result.category || category);

            if (result.seo_title || result.meta_description || result.keywords || result.slug) {
                setSEO(prev => ({
                    ...prev,
                    metaTitle: result.seo_title || prev.metaTitle,
                    metaDescription: result.meta_description || prev.metaDescription,
                    keywords: result.keywords || prev.keywords,
                    slug: result.slug || prev.slug
                }));
            }

            // Update live score state immediately from AI response
            if (result.seo_score !== undefined)       setSeoScore(result.seo_score);
            if (result.quality_score !== undefined)    setQualityScore(result.quality_score);
            if (result.readability_score !== undefined) setReadabilityScore(result.readability_score);
            if (result.ai_confidence !== undefined)   setAiConfidence(result.ai_confidence);

            // Step 3: Completed
            toast.success('AI regeneration completed');
            setAiStatus(prev => ({...prev, regenerate: 'completed', regenerateMsg: 'AI regeneration completed'}));
            setTimeout(() => setAiStatus(prev => ({...prev, regenerate: null, regenerateMsg: ''})), 3000);
        } catch (error) {
            const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
            console.error('[Regenerate] FAILED — status:', error.response?.status, '| error:', errMsg);
            // Step 3 (failure): Failed
            toast.error(`AI regeneration failed: ${errMsg}`);
            setAiStatus(prev => ({...prev, regenerate: 'failed', regenerateMsg: 'AI regeneration failed'}));
            setTimeout(() => setAiStatus(prev => ({...prev, regenerate: null, regenerateMsg: ''})), 4000);
        } finally {
            setProcessing(false);
        }
    };

    const handleRewrite = async () => {
        setProcessing(true);
        setAiStatus(prev => ({...prev, rewrite: 'processing', rewriteMsg: ''}));
        try {
            const result = await aiService.rewriteArticle(id);
            setContent(result.content || content);
            toast.success('Article rewritten');
            setAiStatus(prev => ({...prev, rewrite: 'success', rewriteMsg: 'Content updated successfully'}));
            setTimeout(() => setAiStatus(prev => ({...prev, rewrite: null, rewriteMsg: ''})), 4000);
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Rewrite failed';
            toast.error(msg);
            setAiStatus(prev => ({...prev, rewrite: 'failed', rewriteMsg: msg}));
            setTimeout(() => setAiStatus(prev => ({...prev, rewrite: null, rewriteMsg: ''})), 6000);
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateSummary = async () => {
        setProcessing(true);
        setAiStatus(prev => ({...prev, summary: 'processing', summaryMsg: ''}));
        try {
            const result = await aiService.summarizeArticle(id);
            setSummary(result.summary || '');
            toast.success('Summary generated');
            setAiStatus(prev => ({...prev, summary: 'success', summaryMsg: 'Summary updated'}));
            setTimeout(() => setAiStatus(prev => ({...prev, summary: null, summaryMsg: ''})), 4000);
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Summary failed';
            toast.error(msg);
            setAiStatus(prev => ({...prev, summary: 'failed', summaryMsg: msg}));
            setTimeout(() => setAiStatus(prev => ({...prev, summary: null, summaryMsg: ''})), 6000);
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateSEO = async () => {
        setProcessing(true);
        setAiStatus(prev => ({...prev, seo: 'processing', seoMsg: ''}));
        try {
            const result = await aiService.generateSEO(id);
            setSEO({
                metaTitle: result.metaTitle || result.seoData?.seo_title || seo.metaTitle,
                metaDescription: result.metaDescription || result.seoData?.meta_description || seo.metaDescription,
                keywords: result.keywords || seo.keywords || []
            });
            toast.success('SEO metadata generated');
            setAiStatus(prev => ({...prev, seo: 'success', seoMsg: 'SEO fields updated'}));
            setTimeout(() => setAiStatus(prev => ({...prev, seo: null, seoMsg: ''})), 4000);
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'SEO generation failed';
            toast.error(msg);
            setAiStatus(prev => ({...prev, seo: 'failed', seoMsg: msg}));
            setTimeout(() => setAiStatus(prev => ({...prev, seo: null, seoMsg: ''})), 6000);
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateTags = async () => {
        setProcessing(true);
        setAiStatus(prev => ({...prev, tags: 'processing', tagsMsg: ''}));
        try {
            const result = await aiService.generateTags(id);
            const tags = result.tags || [];
            setTagsInput(typeof tags === 'string' ? tags : tags.join(', '));
            toast.success('Tags generated');
            setAiStatus(prev => ({...prev, tags: 'success', tagsMsg: 'Tags updated'}));
            setTimeout(() => setAiStatus(prev => ({...prev, tags: null, tagsMsg: ''})), 4000);
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Tag generation failed';
            toast.error(msg);
            setAiStatus(prev => ({...prev, tags: 'failed', tagsMsg: msg}));
            setTimeout(() => setAiStatus(prev => ({...prev, tags: null, tagsMsg: ''})), 6000);
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateImagePrompt = async () => {
        setProcessing(true);
        setAiStatus(prev => ({...prev, image: 'processing', imageMsg: ''}));
        try {
            const result = await aiService.generateImagePrompt(id);
            setImagePrompt(result.prompt || '');
            toast.success('Image prompt generated');
            setAiStatus(prev => ({...prev, image: 'success', imageMsg: 'Prompt ready'}));
            setTimeout(() => setAiStatus(prev => ({...prev, image: null, imageMsg: ''})), 4000);
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Image prompt failed';
            toast.error(msg);
            setAiStatus(prev => ({...prev, image: 'failed', imageMsg: msg}));
            setTimeout(() => setAiStatus(prev => ({...prev, image: null, imageMsg: ''})), 6000);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <div className="flex items-center mb-4">
                <button onClick={() => navigate('/articles')} className="text-gray-500 hover:text-gray-700 mr-4">
                    <ArrowLeft size={18} />
                </button>
                <h1 className="text-2xl font-bold text-gray-800">Edit Article</h1>
                
                <div className="ml-auto text-sm text-gray-500 font-medium capitalize">
                    Status: <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{article?.status || 'draft'}</span>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
                
                {/* Basic Info */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Article Title</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border rounded-lg text-lg font-semibold text-gray-900" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-sm font-medium text-gray-700">Category</label>
                        </div>
                        <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border rounded-lg text-gray-900" />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-sm font-medium text-gray-700">Tags (comma separated)</label>
                            <button type="button" onClick={handleGenerateTags} disabled={processing} className="text-xs text-purple-600 hover:text-purple-800 flex items-center"><Sparkles size={12} className="mr-1"/> Generate Tags</button>
                        </div>
                        <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="w-full p-2 border rounded-lg text-gray-900" />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-medium text-gray-700">Summary</label>
                        <button type="button" onClick={handleGenerateSummary} disabled={processing} className="text-xs text-purple-600 hover:text-purple-800 flex items-center"><AlignCenter size={12} className="mr-1"/> Generate Summary</button>
                    </div>
                    <textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="w-full h-24 p-3 border rounded-lg text-gray-900 bg-gray-50 focus:bg-white"></textarea>
                </div>

                {/* Content Editor */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">HTML Content</label>
                        <div className="flex flex-col items-end">
                            <div className="flex gap-2 relative">
                                <button type="button" onClick={handleRewrite} disabled={processing} className="text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded flex items-center"><Wand2 size={12} className="mr-1"/> Rewrite Style</button>
                                <button
                                    type="button"
                                    onClick={handleRegenerate}
                                    disabled={processing}
                                    className={`text-xs px-2 py-1 rounded flex items-center transition-colors
                                        ${aiStatus.regenerate === 'failed'     ? 'text-red-700 bg-red-50' :
                                          aiStatus.regenerate === 'completed'  ? 'text-green-700 bg-green-50' :
                                          aiStatus.regenerate === 'waiting'    ? 'text-amber-700 bg-amber-50' :
                                          'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
                                >
                                    {aiStatus.regenerate === 'processing'
                                        ? <RefreshCw size={12} className="mr-1 animate-spin" />
                                        : aiStatus.regenerate === 'waiting'
                                        ? <Sparkles size={12} className="mr-1 animate-pulse" />
                                        : aiStatus.regenerate === 'failed'
                                        ? <XCircle size={12} className="mr-1" />
                                        : aiStatus.regenerate === 'completed'
                                        ? <CheckCircle size={12} className="mr-1" />
                                        : <Sparkles size={12} className="mr-1" />}
                                    {aiStatus.regenerate === 'waiting'    ? 'Waiting...'    :
                                     aiStatus.regenerate === 'processing' ? 'Processing...' :
                                     aiStatus.regenerate === 'failed'     ? 'Failed'        :
                                     aiStatus.regenerate === 'completed'  ? 'Completed'     : '✨ Regenerate'}
                                </button>
                            </div>
                            {aiStatus.regenerateMsg && (
                                <span className={`text-[10px] mt-1 font-medium
                                    ${aiStatus.regenerate === 'failed'    ? 'text-red-600'   :
                                      aiStatus.regenerate === 'completed' ? 'text-green-600' :
                                      aiStatus.regenerate === 'waiting'   ? 'text-amber-600' :
                                      'text-indigo-600'}`}>
                                    {aiStatus.regenerateMsg}
                                </span>
                            )}
                        </div>
                    </div>
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full h-[400px] p-4 border rounded-lg font-mono text-sm text-gray-900 bg-gray-50 focus:bg-white transition-colors"></textarea>
                </div>

                {/* Images */}
                <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold flex items-center text-gray-800">Article Images</h3>
                        <div className="flex items-center gap-3">
                            {imagePrompt && <span className="text-xs text-gray-500 truncate max-w-[200px]">Prompt saved</span>}
                            <button type="button" onClick={handleGenerateImagePrompt} disabled={processing} className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded flex items-center"><ImagePlus size={12} className="mr-1"/> Generate Prompt</button>
                        </div>
                    </div>
                    <ImageUpload images={images} onImagesChange={setImages} maxImages={3} articleId={id} />
                </div>

                {/* SEO Panel */}
                <div id="seo-panel" className="pt-6 mt-8 space-y-6">
                    <div className="flex justify-between items-center border-b pb-2">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900">
                                SEO Panel
                            </h3>
                            <button type="button" onClick={handleGenerateSEO} disabled={processing} className="text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md flex items-center font-medium transition-colors">
                                <Sparkles size={14} className="mr-1.5"/> Auto-Generate SEO
                            </button>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-semibold">
                            {seoScore !== null && (
                                <span className="text-orange-500">SEO: {seoScore}/100</span>
                            )}
                            {qualityScore !== null && (
                                <span className="text-indigo-500">Quality: {qualityScore}/100</span>
                            )}
                            {readabilityScore !== null && (
                                <span className="text-teal-500">Readability: {readabilityScore}/100</span>
                            )}
                            {aiConfidence !== null && (
                                <span className="text-purple-500">AI: {aiConfidence}%</span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">SEO Title (max 60)</label>
                            <input type="text" value={seo.metaTitle} onChange={(e) => setSEO({...seo, metaTitle: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-md text-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Meta Description (150-160)</label>
                            <textarea value={seo.metaDescription} onChange={(e) => setSEO({...seo, metaDescription: e.target.value})} className="w-full h-24 p-2.5 border border-gray-200 rounded-md text-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed" />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Slug</label>
                            <input type="text" value={seo.slug} onChange={(e) => setSEO({...seo, slug: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-md text-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Keywords (comma separated)</label>
                            <input type="text" value={typeof seo.keywords === 'string' ? seo.keywords : (seo.keywords || []).join(', ')} onChange={(e) => setSEO({...seo, keywords: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-md text-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Image Alt Text</label>
                            <input type="text" value={seo.imageAlt || ''} onChange={(e) => setSEO({...seo, imageAlt: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-md text-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-start gap-4 pt-4 pb-12">
                <button type="button" onClick={handleSave} disabled={processing} className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium transition-colors flex items-center disabled:opacity-70 shadow-sm">
                    {processing ? <RefreshCw className="mr-2 animate-spin" size={18}/> : <Save className="mr-2" size={18}/>} Save Changes
                </button>

                {article?.status === 'draft' && (
                    <button type="button" onClick={() => handleAction(articleService.approveArticle, 'Article approved')} disabled={processing} className="px-6 py-2.5 bg-[#d97706] hover:bg-[#b45309] text-white rounded font-medium transition-colors flex items-center disabled:opacity-70 shadow-sm">
                        <CheckCircle className="mr-2" size={18}/> Approve
                    </button>
                )}

                {article?.status !== 'published' && (
                    <button type="button" onClick={() => handleAction(articleService.publishArticle, 'Article published')} disabled={processing} className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium transition-colors flex items-center disabled:opacity-70 shadow-sm">
                        <Rocket className="mr-2" size={18}/> Publish
                    </button>
                )}

                <button type="button" onClick={() => navigate('/articles')} className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-medium transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default EditArticle;
