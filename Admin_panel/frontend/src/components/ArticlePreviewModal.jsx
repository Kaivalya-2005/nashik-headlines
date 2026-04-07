import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle2, Rocket, FilePenLine } from 'lucide-react';
import toast from 'react-hot-toast';
import * as newsroomService from '../services/newsroomService';

const ArticlePreviewModal = ({ article, onClose, onActionSuccess }) => {
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  const parsedTags = (() => {
    if (!article?.tags) return [];
    if (Array.isArray(article.tags)) return article.tags.filter(Boolean);
    if (typeof article.tags === 'string') {
      try {
        const decoded = JSON.parse(article.tags);
        return Array.isArray(decoded) ? decoded.filter(Boolean) : [];
      } catch {
        return article.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
      }
    }
    return [];
  })();

  const contentParagraphs = (article?.content || '')
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const parsedImages = (() => {
    if (!article?.images) return [];
    if (Array.isArray(article.images)) return article.images.filter((img) => img?.url);
    if (typeof article.images === 'string') {
      try {
        const decoded = JSON.parse(article.images);
        return Array.isArray(decoded) ? decoded.filter((img) => img?.url) : [];
      } catch {
        return [];
      }
    }
    return [];
  })();

  const heroImage = article?.image || article?.image_url || article?.imageUrl || parsedImages.find((img) => img.isFeatured)?.url || parsedImages[0]?.url || '';

  const handleApprove = async () => {
    if (article.status === 'draft') {
      setActionLoading(true);
      try {
        await newsroomService.approveArticle(article.id);
        toast.success('Article approved');
        onActionSuccess?.();
        onClose();
      } catch (error) {
        toast.error('Failed to approve: ' + error.message);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handlePublish = async () => {
    if (article.status !== 'published') {
      setActionLoading(true);
      try {
        await newsroomService.publishArticle(article.id);
        toast.success('Article published');
        onActionSuccess?.();
        onClose();
      } catch (error) {
        toast.error('Failed to publish: ' + error.message);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'published':
        return 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300';
      case 'approved':
        return 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300';
      case 'draft':
        return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-5xl my-8 border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Article Preview</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <X size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 md:p-6 space-y-6 overflow-y-auto">
          {/* Title & Status */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight text-slate-900 dark:text-slate-100 flex-1">
                {article.title}
              </h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ml-4 ${getStatusColor(article.status)}`}>
                {article.status?.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {article.created_at ? new Date(article.created_at).toLocaleString() : 'Unknown date'}
              {article.source ? ` • ${article.source}` : ''}
              {article.category ? ` • ${article.category}` : ''}
            </p>
          </div>

          {/* Hero image */}
          {heroImage && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
              <div className="aspect-[16/9] w-full">
                <img
                  src={heroImage}
                  alt={article.title || 'Article image'}
                  className="w-full h-full object-cover"
                />
              </div>
              {(article.image_alt || parsedImages.find((img) => img.isFeatured)?.altText) && (
                <p className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
                  {article.image_alt || parsedImages.find((img) => img.isFeatured)?.altText}
                </p>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {article.category && (
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Category</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{article.category}</p>
              </div>
            )}

            {article.source && (
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Source</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{article.source}</p>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Created</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {article.created_at ? new Date(article.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">ID</p>
              <p className="font-mono font-semibold text-slate-900 dark:text-slate-100 text-sm">{article.id}</p>
            </div>
          </div>

          {/* Tags */}
          {parsedTags.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {parsedTags.map((tag, idx) => (
                  <span key={idx} className="px-3 py-1 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {article.summary && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Summary</h3>
              <p className="text-slate-700 dark:text-slate-300 leading-7 bg-slate-50 dark:bg-slate-800 p-4 rounded-md border border-slate-200 dark:border-slate-700">
                {article.summary}
              </p>
            </div>
          )}

          {/* Content */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Full Content</h3>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 md:p-5 rounded-md border border-slate-200 dark:border-slate-700">
              {contentParagraphs.length > 0 ? (
                <div className="space-y-4">
                  {contentParagraphs.map((paragraph, idx) => (
                    <p
                      key={idx}
                      className="text-[15px] md:text-base text-slate-800 dark:text-slate-200 leading-8 whitespace-pre-line"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-[15px] md:text-base text-slate-500 dark:text-slate-400 italic">
                  No article content available.
                </p>
              )}
            </div>
          </div>

          {parsedImages.length > 1 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Image Gallery</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {parsedImages.map((img, idx) => (
                  <figure key={img.id || `${img.url}-${idx}`} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                    <div className="aspect-[4/3] w-full">
                      <img src={img.url} alt={img.altText || `${article.title} ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                    {(img.caption || img.altText) && (
                      <figcaption className="px-3 py-2 text-sm text-slate-600 dark:text-slate-400">
                        {img.caption || img.altText}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </div>
          )}

          {/* SEO Title (if available) */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">SEO Snapshot</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">SEO Score</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{Number(article.seo_score || 0)} / 100</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Slug</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100 break-all">{article.slug || '—'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700 md:col-span-2">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">SEO Title</p>
                <p className="text-slate-900 dark:text-slate-100">{article.seo_title || '—'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700 md:col-span-2">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Meta Description</p>
                <p className="text-slate-900 dark:text-slate-100">{article.meta_description || '—'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700 md:col-span-2">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Keywords</p>
                <p className="text-slate-900 dark:text-slate-100">{article.keywords || '—'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700 md:col-span-2">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Image Alt Text</p>
                <p className="text-slate-900 dark:text-slate-100">{article.image_alt || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 p-5 md:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <button
            onClick={() => {
              onClose?.();
              navigate(`/articles/edit/${article.id}`);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-md font-medium transition-colors"
          >
            <FilePenLine size={18} />
            Edit
          </button>

          {article.status?.toLowerCase() === 'draft' && (
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-md font-medium transition-colors"
            >
              <CheckCircle2 size={18} />
              Approve
            </button>
          )}

          {article.status?.toLowerCase() !== 'published' && (
            <button
              onClick={handlePublish}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-md font-medium transition-colors"
            >
              <Rocket size={18} />
              Publish
            </button>
          )}

          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArticlePreviewModal;
