/**
 * ArticlePage — clean reader with DB-driven articles.
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, Bookmark, BookmarkCheck } from "lucide-react";
import { fetchArticleById, fetchArticleBySlug, fetchRelatedArticles, incrementViews } from "@/services/articleService";
import { CATEGORIES, Article } from "@/types/news";
import { formatDate } from "@/utils/formatDate";
import { useBookmarks } from "@/hooks/useBookmarks";
import NewsCard from "@/components/NewsCard";
import ShareMenu from "@/components/ShareMenu";
import SEOHead from "@/components/SEOHead";
import NewsCardSkeleton from "@/components/NewsCardSkeleton";
import AdBanner from "@/components/AdBanner";

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      // Try slug first, then fallback to ID
      let a = await fetchArticleBySlug(id);
      if (!a) a = await fetchArticleById(id);
      setArticle(a);
      if (a) {
        incrementViews(a.id);
        const rel = await fetchRelatedArticles(a.id, a.category);
        setRelated(rel);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <NewsCardSkeleton variant="featured" />
      </main>
    );
  }

  if (!article) {
    return (
      <main className="container mx-auto px-4 py-20 text-center">
        <SEOHead title="Article Not Found" canonicalPath={`/article/${id}`} />
        <h1 className="font-headline text-display mb-4">Article Not Found</h1>
        <Link to="/" className="text-accent hover:underline text-body-lg">← Back to homepage</Link>
      </main>
    );
  }

  const categoryInfo = CATEGORIES.find((c) => c.slug === article.category);
  const articleUrl = typeof window !== "undefined" ? window.location.href : "";

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.headline,
    description: article.summary,
    image: article.imageUrl,
    datePublished: article.publishedAt,
    author: { "@type": "Person", name: article.source },
    publisher: {
      "@type": "Organization",
      name: "Nashik Headlines",
      logo: { "@type": "ImageObject", url: "https://nashikheadlines.com/favicon.ico" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    articleSection: categoryInfo?.label || "News",
    wordCount: article.content.split(/\s+/).length,
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <SEOHead
        title={article.headline}
        description={article.summary}
        ogImage={article.imageUrl}
        ogType="article"
        canonicalPath={`/article/${article.id}`}
        jsonLd={articleJsonLd}
      />

      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        Back to headlines
      </Link>

      <article className="animate-fade-in-up">
        {categoryInfo && (
          <span className={`category-badge mb-5 ${categoryInfo.colorClass}`}>{categoryInfo.label}</span>
        )}

        <h1 className="font-headline font-bold text-display mb-5">{article.headline}</h1>
        <p className="text-body-lg text-muted-foreground leading-relaxed mb-5">{article.summary}</p>

        <div className="flex items-center flex-wrap gap-4 text-caption text-muted-foreground mb-8 pb-6 border-b border-border">
          <span className="font-semibold text-foreground/70">{article.source}</span>
          <span>{formatDate(article.publishedAt)}</span>
          <div className="flex items-center gap-1">
            <Clock size={13} />
            <span>{article.readTime} min read</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => toggleBookmark(article.id)}
              className="p-2.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Bookmark"
            >
              {isBookmarked(article.id) ? (
                <BookmarkCheck size={18} className="text-accent" />
              ) : (
                <Bookmark size={18} />
              )}
            </button>
            <ShareMenu title={article.headline} url={articleUrl} summary={article.summary} />
          </div>
        </div>

        <img
          src={article.imageUrl}
          alt={article.headline}
          className="w-full rounded-xl mb-10"
          loading="lazy"
          decoding="async"
          width={800}
          height={500}
        />

        <div className="max-w-none">
          {article.content.split("\n\n").map((paragraph, i) => (
            <p key={i} className="mb-5 text-body-lg leading-[1.8] text-foreground/85">{paragraph}</p>
          ))}
        </div>

        {/* Ad placement after article content */}
        <AdBanner slot="article-bottom" format="horizontal" />
      </article>

      {related.length > 0 && (
        <section className="mt-16 pt-10 border-t border-border">
          <h2 className="font-headline font-bold text-title mb-6">Related Articles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {related.map((relArticle) => (
              <NewsCard
                key={relArticle.id}
                article={relArticle}
                isBookmarked={isBookmarked(relArticle.id)}
                onToggleBookmark={toggleBookmark}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
