import React, { useState, useEffect } from 'react';
import { Upload, X, Wand2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const ImageUpload = ({ images = [], onImagesChange, onGenerateSEO, maxImages = 3, articleId = null }) => {

    // Revoke URLs on unmount to avoid memory leaks
    useEffect(() => {
        return () => {
            if (images && images.length > 0) {
                images.forEach(img => {
                    if (img.file && img.url && img.url.startsWith('blob:')) {
                        URL.revokeObjectURL(img.url);
                    }
                });
            }
        };
    }, []);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + images.length > maxImages) {
            toast.error(`Maximum ${maxImages} images allowed`);
            return;
        }

        const newImages = files.map(file => ({
            id: Math.random().toString(36).substr(2, 9), // Temp ID
            url: URL.createObjectURL(file), // Immediate preview
            file: file,
            caption: '',
            altText: '',
            isFeatured: images.length === 0 // Make first image featured if none exist
        }));

        onImagesChange([...images, ...newImages]);
        e.target.value = null; // Reset input
    };

    const removeImage = (idToRemove) => {
        // Revoke URL if it's a blob
        const img = images.find(i => i.id === idToRemove);
        if (img && img.file && img.url) {
            URL.revokeObjectURL(img.url);
        }

        const updated = images.filter(img => img.id !== idToRemove);
        onImagesChange(updated);
    };

    const updateMeta = (idToUpdate, field, value) => {
        const updated = images.map(img =>
            img.id === idToUpdate ? { ...img, [field]: value } : img
        );
        onImagesChange(updated);
    };

    const toggleFeatured = (idToToggle) => {
        const updated = images.map(img => ({
            ...img,
            isFeatured: img.id === idToToggle
        }));
        onImagesChange(updated);
    };

    const handleAIGenerate = (id) => {
        if (!onGenerateSEO || !articleId) {
            toast.error("Save the draft first to use AI features.");
            return;
        }
        onGenerateSEO(id);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Article Images (Max {maxImages})</label>
                <span className="text-xs text-gray-500">{images.length}/{maxImages} Uploaded</span>
            </div>

            {/* Dropzone area */}
            {images.length < maxImages && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                    <input
                        type="file"
                        id="image-upload"
                        className="hidden"
                        accept="image/png, image/jpeg, image/webp"
                        multiple
                        onChange={handleFileChange}
                    />
                    <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                        <Upload className="text-gray-400 mb-2" size={32} />
                        <span className="text-sm text-gray-600">Click to upload JPG, PNG, WEBP</span>
                    </label>
                </div>
            )}

            {/* Image List */}
            <div className="grid grid-cols-1 gap-4">
                {images.map((img) => {
                    const uniqueId = img.id;
                    return (
                        <div key={uniqueId} className="border rounded-lg p-4 bg-white relative shadow-sm">
                            <button
                                onClick={() => removeImage(uniqueId)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1"
                                title="Remove Image"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex flex-col sm:flex-row gap-4">
                                {/* Thumbnail & Featured Toggle */}
                                <div className="flex-shrink-0">
                                    <img
                                        src={img.url}
                                        alt={img.altText || "Preview"}
                                        className="w-32 h-32 object-cover rounded-md border border-gray-300 bg-gray-50 text-gray-500 text-xs flex items-center justify-center p-2"
                                    />
                                    <div className="mt-2 text-center">
                                        <button
                                            onClick={() => toggleFeatured(uniqueId)}
                                            className={`text-xs px-2 py-1 rounded-full border ${img.isFeatured
                                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {img.isFeatured ? '★ Featured' : 'Set Featured'}
                                        </button>
                                    </div>
                                </div>

                                {/* Inputs */}
                                <div className="flex-grow space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Caption (Marathi)</label>
                                        <input
                                            type="text"
                                            value={img.caption || ''}
                                            onChange={(e) => updateMeta(uniqueId, 'caption', e.target.value)}
                                            className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 bg-gray-50 text-gray-900"
                                            placeholder="Enter caption..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Alt Text (Marathi)</label>
                                        <input
                                            type="text"
                                            value={img.altText || ''}
                                            onChange={(e) => updateMeta(uniqueId, 'altText', e.target.value)}
                                            className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 bg-gray-50 text-gray-900"
                                            placeholder="Enter alt text..."
                                        />
                                    </div>

                                    <div className="pt-1">
                                        <button
                                            onClick={() => handleAIGenerate(uniqueId)}
                                            disabled={!articleId} // Only disable if creating new article
                                            className="text-xs flex items-center text-purple-700 bg-purple-50 px-2 py-1 rounded hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title={!articleId ? "Save draft first to use AI" : "Generate Caption & Alt Text"}
                                        >
                                            <Wand2 size={14} className="mr-1" />
                                            Generate AI Caption & Alt Text
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ImageUpload;
