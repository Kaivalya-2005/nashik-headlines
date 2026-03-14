/**
 * CategoryPage — articles filtered by category from DB.
 */

import { useParams } from "react-router-dom";
import { CATEGORIES, Category } from "@/types/news";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useNewsQuery } from "@/hooks/useNewsQuery";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import SEOHead from "@/components/SEOHead";
import NewsCard from "@/components/NewsCard";
import NewsCardSkeleton from "@/components/NewsCardSkeleton";
import { Loader2 } from "lucide-react";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: articles = [], isLoading } = useNewsQuery(slug as Category);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const categoryInfo = CATEGORIES.find((c) => c.slug === slug);
  const title = categoryInfo?.label || "News";

  const { visibleItems, hasMore, loaderRef } = useInfiniteScroll({
    items: articles,
    pageSize: 6,
  });

  return (
    <>
      <SEOHead
        title={`${title} News`}
        description={`Latest ${title.toLowerCase()} news headlines.`}
        canonicalPath={`/category/${slug}`}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-headline font-bold text-display">{title}</h1>
          <p className="text-body-lg text-muted-foreground mt-1">
            Latest headlines from {title}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <p className="text-muted-foreground py-16 text-center text-body-lg">
            No articles found in this category.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleItems.map((article, index) => (
                <div
                  key={article.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <NewsCard
                    article={article}
                    isBookmarked={isBookmarked(article.id)}
                    onToggleBookmark={toggleBookmark}
                  />
                </div>
              ))}
            </div>

            {hasMore && (
              <div ref={loaderRef} className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
