import React, { useEffect } from 'react';
import { Upload, X, Sparkles, Star } from 'lucide-react';
import toast from 'react-hot-toast';

const ImageUpload = ({ images = [], onImagesChange, onGenerateAltText, maxImages = 3, generatingAlt }) => {

    // Revoke blob URLs on unmount to avoid memory leaks
    useEffect(() => {
        return () => {
            images.forEach(img => {
                if (img.file && img.url?.startsWith('blob:')) {
                    URL.revokeObjectURL(img.url);
                }
            });
        };
    }, []);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + images.length > maxImages) {
            toast.error(`Maximum ${maxImages} images allowed`);
            return;
        }

        const newImages = files.map((file, i) => ({
            id: Math.random().toString(36).substr(2, 9),
            url: URL.createObjectURL(file),
            file,
            caption: '',
            altText: '',
            isFeatured: images.length === 0 && i === 0,
        }));

        onImagesChange([...images, ...newImages]);
        e.target.value = null;
    };

    const removeImage = (idToRemove) => {
        const img = images.find(i => i.id === idToRemove);
        if (img?.file && img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url);

        const updated = images.filter(img => img.id !== idToRemove);
        // If we removed the featured image, make the first remaining one featured
        if (updated.length > 0 && !updated.some(i => i.isFeatured)) {
            updated[0].isFeatured = true;
        }
        onImagesChange(updated);
    };

    const updateMeta = (id, field, value) => {
        onImagesChange(images.map(img => img.id === id ? { ...img, [field]: value } : img));
    };

    const toggleFeatured = (id) => {
        onImagesChange(images.map(img => ({ ...img, isFeatured: img.id === id })));
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter(f =>
            ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
        );
        if (files.length === 0) return toast.error('Only JPG, PNG, WEBP files allowed');
        if (files.length + images.length > maxImages) return toast.error(`Maximum ${maxImages} images allowed`);

        const newImages = files.map((file, i) => ({
            id: Math.random().toString(36).substr(2, 9),
            url: URL.createObjectURL(file),
            file,
            caption: '',
            altText: '',
            isFeatured: images.length === 0 && i === 0,
        }));
        onImagesChange([...images, ...newImages]);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Article Images <span className="text-gray-400 dark:text-gray-500 font-normal">(Max {maxImages})</span>
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">{images.length}/{maxImages} uploaded</span>
            </div>

            {/* Dropzone */}
            {images.length < maxImages && (
                <div
                    className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg p-8 text-center hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors bg-white dark:bg-slate-900/50 cursor-pointer"
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => document.getElementById('image-upload-input').click()}
                >
                    <input
                        type="file"
                        id="image-upload-input"
                        className="hidden"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        onChange={handleFileChange}
                    />
                    <Upload className="text-gray-400 mx-auto mb-2" size={28} />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Click or drag & drop to upload</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG, WEBP — max 10MB each</p>
                </div>
            )}

            {/* Image list */}
            <div className="space-y-4">
                {images.map((img) => {
                    const altMissing = !img.altText?.trim();
                    const altLen = (img.altText || '').length;
                    const altGood = altLen >= 50 && altLen <= 125;
                    const isGenerating = generatingAlt === img.id;

                    return (
                        <div key={img.id} className={`border rounded-lg p-4 bg-white dark:bg-slate-900 relative shadow-sm transition-colors ${altMissing ? 'border-amber-300 dark:border-amber-700' : 'border-gray-200 dark:border-slate-700'}`}>
                            <button
                                onClick={() => removeImage(img.id)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1 transition-colors"
                                title="Remove"
                            >
                                <X size={18} />
                            </button>

                            <div className="flex flex-col sm:flex-row gap-4">
                                {/* Thumbnail */}
                                <div className="flex-shrink-0 text-center">
                                    <img
                                        src={img.url}
                                        alt={img.altText || 'Preview'}
                                        className="w-32 h-32 object-cover rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950"
                                    />
                                    <button
                                        onClick={() => toggleFeatured(img.id)}
                                        className={`mt-2 text-xs px-2 py-1 rounded-full border flex items-center gap-1 mx-auto transition-colors ${
                                            img.isFeatured
                                                ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                                : 'bg-white dark:bg-slate-950 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-slate-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <Star size={10} fill={img.isFeatured ? 'currentColor' : 'none'} />
                                        {img.isFeatured ? 'Featured' : 'Set Featured'}
                                    </button>
                                </div>

                                {/* Fields */}
                                <div className="flex-grow space-y-3">
                                    {/* Caption */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                            Caption (Marathi) <span className="text-gray-400 font-normal normal-case">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={img.caption || ''}
                                            onChange={(e) => updateMeta(img.id, 'caption', e.target.value)}
                                            className="w-full text-sm p-2 border border-gray-300 dark:border-slate-700 rounded focus:ring-1 focus:ring-indigo-500 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 transition-colors"
                                            placeholder="प्रतिमेसाठी मथळा..."
                                        />
                                    </div>

                                    {/* Alt Text — required */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className={`block text-xs font-semibold uppercase tracking-wide ${altMissing ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                                Alt Text (SEO) <span className="text-red-500">*</span>
                                                {altLen > 0 && (
                                                    <span className={`ml-2 font-normal normal-case ${altGood ? 'text-green-500' : 'text-gray-400'}`}>
                                                        {altLen} chars {altGood ? '✓' : '(50–125 recommended)'}
                                                    </span>
                                                )}
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => onGenerateAltText(img.id)}
                                                disabled={isGenerating}
                                                className="text-xs flex items-center gap-1 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                                title="Generate SEO alt-text with AI"
                                            >
                                                <Sparkles size={12} className={isGenerating ? 'animate-spin' : ''} />
                                                {isGenerating ? 'Generating...' : 'AI Generate'}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={img.altText || ''}
                                            onChange={(e) => updateMeta(img.id, 'altText', e.target.value)}
                                            className={`w-full text-sm p-2 border rounded focus:ring-1 focus:ring-indigo-500 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 transition-colors ${
                                                altMissing
                                                    ? 'border-amber-400 dark:border-amber-600'
                                                    : 'border-gray-300 dark:border-slate-700'
                                            }`}
                                            placeholder="प्रतिमेचे वर्णन करा... (SEO साठी आवश्यक)"
                                        />
                                        {altMissing && (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                                ⚠️ Alt text is required for better SEO — use AI Generate or type manually
                                            </p>
                                        )}
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
