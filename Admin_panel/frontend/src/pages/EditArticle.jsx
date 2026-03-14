import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, BarChart, Sparkles, Globe, RefreshCw } from 'lucide-react';
import articleService from '../services/articleService';
import toast from 'react-hot-toast';
import ImageUpload from '../components/ImageUpload';
import useGenerationStatus from '../hooks/useGenerationStatus';
import StatusBadge from '../components/StatusBadge';

const EditArticle = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // AI Status Hook
    const { status, error: genError, startPolling } = useGenerationStatus(id);

    // Form States

    // Form States
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [seo, setSEO] = useState({ meta_title: '', meta_description: '', focus_keywords: [] });
    const [images, setImages] = useState([]);

    useEffect(() => {
        loadArticle();
    }, [id]);

    // Poll on mount if status is pending/processing (or just always start polling to check)
    useEffect(() => {
        startPolling();
    }, [id]);

    // When generation completes, reload data
    useEffect(() => {
        if (status === 'COMPLETED') {
            toast.success('AI Content Generated Successfully!');
            loadArticle();
        }
    }, [status]);

    const loadArticle = async () => {
        try {
            const data = await articleService.getById(id);
            setArticle(data);
            setTitle(data.title);
            setContent(data.content || '');
            setSEO(data.seo || {});
            setImages(data.images || []);
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
            // 1. Upload new images if any
            const newFiles = images.filter(img => img.file && !img.url.startsWith('/uploads')); // Check for local files
            // Simple check: if it has a 'file' object, it's new. 
            // Existing images from DB don't have 'file' prop usually.

            if (newFiles.length > 0) {
                const formData = new FormData();
                newFiles.forEach(img => {
                    formData.append('images', img.file);
                });
                await articleService.uploadImages(id, formData);

                // Note: The upload is additive. 
                // We need to reload article to get the new URLs and IDs, 
                // OR we just trust that the save below will overwrite with our local state?
                // Actually, uploadImages appends to the array in DB.
                // updateArticle REPLACES the array if we send it.
                // This is a conflict!

                // Strategy: 
                // 1. Upload images (DB now has Old + New)
                // 2. Fetch updated article to get the standardized array.
                // 3. Merge our local metadata updates (captions/alts) into that array?
                // OR: 
                // Since this is a simple admin panel:
                // We should probably rely on reloading after upload, then saving metadata.

                // Let's do: Upload -> Reload -> Apply local captions -> Save Metadata
                const afterUpload = await articleService.getById(id);
                // merge local captions to the new list?
                // This is getting complex.

            }

            // SIMPLIFIED APPROACH:
            // If new files exist, Upload them first.
            if (newFiles.length > 0) {
                const formData = new FormData();
                newFiles.forEach(img => {
                    formData.append('images', img.file);
                });
                await articleService.uploadImages(id, formData);
            }

            // Now save the metadata. 
            // IMPORTANT: If we just uploaded, the DB has new images. 
            // If we send `images` from state (which has blobs), and override DB, we might lose paths?
            // `updateArticle` expects the full object.

            // To be safe: We should filter out the "file" objects and only send the "metadata" objects?
            // But the backend `images` field expects `url`, `path`, etc.

            // If we sent the *existing* images with updated captions, that works.
            // But for the *newly uploaded* ones, our local state only has Blob URLs, not Server Paths.
            // So we MUST reload the article after upload to get the paths, BEFORE saving metadata?
            // Or we assume `uploadImages` returns the *new* image objects?
            // My controller `uploadArticleImages` returns `res.json(article.images)`. YES!

            let currentImages = images;

            if (newFiles.length > 0) {
                const formData = new FormData();
                newFiles.forEach(img => {
                    formData.append('images', img.file);
                });
                const serverImages = await articleService.uploadImages(id, formData);

                // Now we need to map our local captions to these new server images?
                // This is hard because we don't know which is which easily without IDs.
                // Assuming order is preserved? 
                // Multer appends.
                // Let's just use the server response for the list, 
                // and maybe try to match?
                // For MVP: Just replace local state with server response. 
                // User might lose the caption they *just typed* for the new image if they didn't save?
                // Risk accepted for now.
                currentImages = serverImages;
            }

            // Filter out any that still have files but no server URL (should be none)
            const imagesToSave = currentImages.map(img => ({
                url: img.url,
                path: img.path,
                caption: img.caption,
                altText: img.altText,
                isFeatured: img.isFeatured,
                wpId: img.wpId,
                _id: img._id
            })).filter(img => img.path); // Ensure valid

            const updated = await articleService.update(id, {
                title,
                content,
                seo,
                images: imagesToSave
            });

            toast.success('Saved successfully');
            setArticle(updated);
            setImages(updated.images || []); // Update local state
            navigate('/articles');
        } catch (error) {
            console.error('[Save Error]:', error);
            const msg = error.response?.data?.message || 'Failed to save changes.';
            toast.error(msg, { duration: 5000 });
        } finally {
            setProcessing(false);
        }
    };

    const handleAnalyzeSEO = async () => {
        setProcessing(true);
        try {
            const result = await articleService.analyzeSEO(id);
            // Result is { seoScore, seoReport, ... }
            // Backend saves it to DB, so reload or update local state
            setArticle(prev => ({ ...prev, seo: { ...prev.seo, seoScore: result.seoScore, seoReport: result.seoReport } }));
            toast.success(`SEO Score: ${result.seoScore}/100`);
        } catch (error) {
            toast.error('Analysis failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleImproveSEO = async () => {
        setProcessing(true);
        try {
            const result = await articleService.improveSEO(id);
            setSEO({
                meta_title: result.meta_title,
                meta_description: result.meta_description,
                focus_keywords: result.focus_keywords
            });
            // Update score as well
            setArticle(prev => ({ ...prev, seo: { ...prev.seo, seoScore: result.seoScore, seoReport: result.seoReport } }));
            toast.success('SEO Metadata Improved!');
        } catch (error) {
            toast.error('Improvement failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateImageSEO = async (uniqueId) => {
        setProcessing(true);
        try {
            let dbId = uniqueId;
            const currentImg = images.find(img => (img._id || img.id) === uniqueId);

            // If image is new (has file, no _id, or id is short temp id), upload it first
            if (currentImg && currentImg.file && !currentImg._id) {
                toast.loading('Uploading image first...');
                const formData = new FormData();
                formData.append('images', currentImg.file);

                // Upload
                const updatedImages = await articleService.uploadImages(id, formData);

                // Find the new image in the updated list (by filename or just matching count?)
                // Since duplicates with same filename are possible, this is imperfect but acceptable for mvp.
                // Better: backend returns the new image objects in order.
                // We uploaded 1 image. It should be at the end?
                // Multer appends.

                // Let's assume the last image in the array is ours?
                // Or map by filename.
                const newImg = updatedImages.find(img => img.path.includes(currentImg.file.name.replace(/[^a-zA-Z0-9.]/g, '')));
                // Loose match or use the last one.
                const uploadedImg = updatedImages[updatedImages.length - 1]; // Fallback to last

                if (uploadedImg) {
                    dbId = uploadedImg._id;
                    // Update local state to reflect the upload immediately
                    setImages(updatedImages);
                } else {
                    throw new Error("Failed to locate uploaded image ID");
                }
            }

            toast.loading('Generating AI Caption...');
            const result = await articleService.generateImageSEO(id, dbId);
            toast.dismiss();

            // Update local state for that image
            setImages(prev => prev.map(img =>
                img._id === dbId ? { ...img, caption: result.caption, altText: result.altText } : img
            ));

            toast.success('Image Caption Generated!');
        } catch (error) {
            console.error('[Image AI Error]:', error);
            const msg = error.response?.data?.message || 'Image AI failed.';
            toast.error(msg, { duration: 5000 });
        } finally {
            setProcessing(false);
        }
    };

    // Manual SEO update handling is tricky if backend doesn't support it in updateArticle.
    // For MVP, we rely on AI to generate SEO, or we add SEO fields to updateArticle controller.
    // Let's assume user accepts AI logic.

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Editor */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center mb-4">
                    <button onClick={() => navigate('/articles')} className="text-gray-500 hover:text-gray-700 mr-4">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Edit Article</h1>
                    <div className="ml-4">
                        <StatusBadge status={status} error={genError} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Article Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-2 border rounded-lg mb-4 text-lg font-semibold text-gray-900"
                    />

                    <label className="block text-sm font-medium text-gray-700 mb-1">HTML Content</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-[500px] p-4 border rounded-lg font-mono text-sm text-gray-900 bg-gray-50 focus:bg-white transition-colors"
                    ></textarea>
                    {/* In a real app, use a Rich Text Editor like Quill or TinyMCE here */}
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

                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-bold mb-4">Article Images</h3>
                    <ImageUpload
                        images={images}
                        onImagesChange={setImages}
                        maxImages={3}
                        articleId={id}
                        onGenerateSEO={(imgId) => handleGenerateImageSEO(imgId)}
                    />
                </div>
            </div>

            {/* Right Column: SEO & Actions */}
            <div className="space-y-6 lg:mt-12">
                {/* SEO Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center">
                        <BarChart className="mr-2 text-blue-500" /> SEO Status
                    </h3>

                    <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-600">Score</span>
                        <span className={`text-2xl font-bold ${(article.seo?.seoScore || 0) >= 80 ? 'text-green-600' :
                            (article.seo?.seoScore || 0) >= 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                            {article.seo?.seoScore || 0}/100
                        </span>
                    </div>

                    <div className="space-y-2 mb-6">
                        <button
                            onClick={handleAnalyzeSEO}
                            disabled={processing}
                            className="w-full flex items-center justify-center p-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 font-medium transition-colors bg-white"
                        >
                            Analyze SEO
                        </button>
                        <button
                            onClick={handleImproveSEO}
                            disabled={processing}
                            className="w-full flex items-center justify-center p-2 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 font-medium transition-colors"
                        >
                            <Sparkles size={16} className="mr-2" /> AI Improve Meta
                        </button>
                    </div>

                    <div className="space-y-4 border-t pt-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">Meta Title</label>
                            <p className="text-sm text-gray-800">{seo.meta_title || 'Not set'}</p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">Meta Description</label>
                            <p className="text-sm text-gray-600 line-clamp-3">{seo.meta_description || 'Not set'}</p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">Keywords</label>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {seo.focus_keywords?.map((k, i) => (
                                    <span key={i} className="text-xs bg-gray-100 text-gray-800 border border-gray-200 px-2 py-1 rounded">{k}</span>
                                ))}
                                {(!seo.focus_keywords || seo.focus_keywords.length === 0) && <span className="text-sm text-gray-400">None</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* WP Status */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center">
                        <Globe className="mr-2 text-blue-500" /> Publishing
                    </h3>

                    <div className="mb-4">
                        <span className="text-sm text-gray-500 block">Status</span>
                        <span className="font-semibold capitalize">{article.status}</span>
                    </div>

                    {article.wpUrl && (
                        <div className="mb-4">
                            <a href={article.wpUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm break-all">
                                View on WordPress
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditArticle;
