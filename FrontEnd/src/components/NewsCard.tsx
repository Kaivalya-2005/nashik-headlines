/**
 * NewsCard — premium news article card component.
 * Supports featured, default, and compact variants.
 * Includes image, category badge, headline, summary, source, time, and bookmark.
 */

import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, Clock } from "lucide-react";
import { Article, CATEGORIES } from "@/types/news";
import { timeAgo } from "@/utils/formatDate";

interface NewsCardProps {
  article: Article;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  variant?: "default" | "featured" | "compact";
}

export default function NewsCard({
  article,
  isBookmarked,
  onToggleBookmark,
  variant = "default",
}: NewsCardProps) {
  const categoryInfo = CATEGORIES.find((c) => c.slug === article.category);

  /* ── Compact variant (sidebar / trending) ── */
  if (variant === "compact") {
    return (
      <Link
        to={`/article/${article.slug || article.id}`}
        className="flex gap-3 p-2 rounded-lg hover:bg-secondary/60 transition-colors group"
      >
        <img
          src={article.imageUrl}
          alt={article.headline}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          loading="lazy"
        />
        <div className="flex-1 min-w-0 py-0.5">
          <h3 className="font-headline font-semibold text-sm leading-snug line-clamp-2 headline-link">
            {article.headline}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-caption text-muted-foreground">
            <span>{article.source}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{timeAgo(article.publishedAt)}</span>
          </div>
        </div>
      </Link>
    );
  }

  /* ── Featured variant (hero card) ── */
  if (variant === "featured") {
    return (
      <article className="news-card relative group">
        <Link to={`/article/${article.slug || article.id}`} className="block">
          <div className="aspect-[16/9] overflow-hidden">
            <img
              src={article.imageUrl}
              alt={article.headline}
              className="w-full h-full object-cover card-image"
              loading="lazy"
            />
          </div>
          <div className="p-5 md:p-6">
            {categoryInfo && (
              <span className={`category-badge mb-3 ${categoryInfo.colorClass}`}>
                {categoryInfo.label}
              </span>
            )}
            <h2 className="font-headline font-bold text-title-lg leading-tight mb-2.5 headline-link">
              {article.headline}
            </h2>
            <p className="text-muted-foreground text-body leading-relaxed line-clamp-2 mb-4">
              {article.summary}
            </p>
            <div className="flex items-center justify-between text-caption text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground/70">{article.source}</span>
                <span className="text-muted-foreground/40">·</span>
                <span>{timeAgo(article.publishedAt)}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground/60">
                <Clock size={12} />
                <span>{article.readTime} min read</span>
              </div>
            </div>
          </div>
        </Link>
        {/* Bookmark FAB */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleBookmark(article.id);
          }}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-background/90 backdrop-blur-md shadow-sm hover:bg-background transition-all duration-200 hover:scale-110"
          aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        >
          {isBookmarked ? (
            <BookmarkCheck size={16} className="text-accent" />
          ) : (
            <Bookmark size={16} className="text-muted-foreground" />
          )}
        </button>
      </article>
    );
  }

  /* ── Default variant ── */
  return (
    <article className="news-card relative group">
      <Link to={`/article/${article.slug || article.id}`} className="block">
        <div className="aspect-[16/10] overflow-hidden">
          <img
            src={article.imageUrl}
            alt={article.headline}
            className="w-full h-full object-cover card-image"
            loading="lazy"
          />
        </div>
        <div className="p-4">
          {categoryInfo && (
            <span className={`category-badge mb-2.5 ${categoryInfo.colorClass}`}>
              {categoryInfo.label}
            </span>
          )}
          <h3 className="font-headline font-semibold text-base leading-snug mb-1.5 line-clamp-2 headline-link">
            {article.headline}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-1 mb-3">
            {article.summary}
          </p>
          <div className="flex items-center justify-between text-caption text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground/60">{article.source}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{timeAgo(article.publishedAt)}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground/50">
              <Clock size={11} />
              <span>{article.readTime}m</span>
            </div>
          </div>
        </div>
      </Link>
      {/* Bookmark button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleBookmark(article.id);
        }}
        className="absolute top-3 right-3 p-2 rounded-full bg-background/90 backdrop-blur-md shadow-sm hover:bg-background transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110"
        aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
      >
        {isBookmarked ? (
          <BookmarkCheck size={14} className="text-accent" />
        ) : (
          <Bookmark size={14} className="text-muted-foreground" />
        )}
      </button>
    </article>
  );
}
