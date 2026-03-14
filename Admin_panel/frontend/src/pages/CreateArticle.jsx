import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Save } from 'lucide-react';
import articleService from '../services/articleService';
import toast from 'react-hot-toast';
import ImageUpload from '../components/ImageUpload';

const CreateArticle = () => {
    const navigate = useNavigate();
    const [rawInput, setRawInput] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [seo, setSEO] = useState({ meta_title: '', meta_description: '', focus_keywords: [] });

    const [images, setImages] = useState([]); // State for images
    const [generating, setGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!rawInput.trim()) return toast.error('Please enter raw content');

        setGenerating(true);

        try {
            // 1. Create Initial Draft
            const draft = await articleService.create({
                title: title || 'Untitled Draft',
                rawInput
            });

            // 1b. Upload Images (if any)
            if (images.length > 0) {
                // Filter for new files
                const newFiles = images.filter(img => img.file);

                if (newFiles.length > 0) {
                    console.log("Uploading files:", newFiles); // Debug Log

                    const formData = new FormData();
                    newFiles.forEach(img => {
                        formData.append('images', img.file);
                    });

                    // Upload files
                    // Axios will automatically set Content-Type: multipart/form-data; boundary=...
                    const uploadedImages = await articleService.uploadImages(draft._id, formData);

                    // Note: We might want to sync captions/alt text for these *after* upload
                    // But for MVP we just upload the files.
                }
            }

            // 2. Generate Content (Async)
            const response = await articleService.generateContent(draft._id);

            // Response is now { message, jobId, status: 'PENDING', articleId }
            toast.success('AI Generation Queued!');

            // 3. Move to Edit Step IMMEDIATELY
            navigate(`/articles/edit/${draft._id}`);

        } catch (error) {
            let msg = 'Generation failed due to an unknown error.';

            if (error.response) {
                // The request was made and the server responded with a status code that falls out of the range of 2xx
                msg = error.response.data?.message || `Server Error (${error.response.status})`;
                console.error(`[API Error]: ${msg}`, error.response.data);
            } else if (error.request) {
                // The request was made but no response was received
                msg = 'Network error. Please check your connection to the server.';
                console.error('[API Error]: No response received.', error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                msg = error.message;
                console.error('[API Error]:', msg);
            }

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

            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Raw Input / Source Text (Marathi/English)</label>
                    <textarea
                        value={rawInput}
                        onChange={(e) => setRawInput(e.target.value)}
                        className="w-full h-64 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Paste news details here..."
                    ></textarea>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Working Title (Optional)</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-2 border rounded-lg text-gray-900"
                        placeholder="Internal title for draft..."
                    />
                </div>

                <div className="mb-6">
                    <div className="mb-6">
                        <ImageUpload
                            images={images}
                            onImagesChange={setImages}
                            maxImages={3}
                        // articleId is null here, so AI buttons will be disabled until saved
                        />
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={generating || !rawInput}
                    className="w-full flex items-center justify-center bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                    {generating ? (
                        <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating AI Content...
                        </span>
                    ) : (
                        <>
                            <Sparkles className="mr-2" /> Generate Marathi Article
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default CreateArticle;
