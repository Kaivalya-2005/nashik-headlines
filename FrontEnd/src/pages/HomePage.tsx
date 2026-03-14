/**
 * Homepage — main landing page with DB-driven news.
 */

import { useEffect } from "react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useNewsQuery, useTrendingQuery } from "@/hooks/useNewsQuery";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import SEOHead from "@/components/SEOHead";
import AdBanner from "@/components/AdBanner";
import BreakingBanner from "@/components/BreakingBanner";
import TopNewsSlider from "@/components/TopNewsSlider";
import NewsCard from "@/components/NewsCard";
import NewsCardSkeleton from "@/components/NewsCardSkeleton";
import TrendingSection from "@/components/TrendingSection";
import CategoryHeatmap from "@/components/CategoryHeatmap";
import { Loader2 } from "lucide-react";

const REFRESH_INTERVAL = 5 * 60 * 1000;

export default function HomePage() {
  const { data: articles = [], isLoading, refetch } = useNewsQuery();
  const { data: topStories = [] } = useTrendingQuery(6);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  useEffect(() => {
    const interval = setInterval(() => refetch(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refetch]);

  const [featuredArticle, ...restArticles] = articles;

  const { visibleItems, hasMore, loaderRef } = useInfiniteScroll({
    items: restArticles,
    pageSize: 6,
  });

  return (
    <>
      <SEOHead
        title="Latest News from Nashik & Maharashtra"
        description="Get the latest news headlines from Nashik, Shirdi, Dhule, Malegaon, Igatpuri and all of Maharashtra."
        canonicalPath="/"
      />
      <BreakingBanner />

      <main className="container mx-auto px-4 py-8">
        <TopNewsSlider articles={topStories} />
        <div className="border-t border-border my-8" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-bold text-title">Latest News</h2>
              <span className="text-overline text-muted-foreground">
                {articles.length} articles
              </span>
            </div>

            {isLoading ? (
              <>
                <NewsCardSkeleton variant="featured" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[1, 2, 3, 4].map((i) => (
                    <NewsCardSkeleton key={i} />
                  ))}
                </div>
              </>
            ) : articles.length === 0 ? (
              <p className="text-muted-foreground text-center py-16">
                No articles published yet. Check back soon!
              </p>
            ) : (
              <>
                {featuredArticle && (
                  <div className="animate-fade-in-up">
                    <NewsCard
                      article={featuredArticle}
                      isBookmarked={isBookmarked(featuredArticle.id)}
                      onToggleBookmark={toggleBookmark}
                      variant="featured"
                    />
                  </div>
                )}

                {/* Ad placement after featured article */}
                <AdBanner slot="home-mid" format="horizontal" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {visibleItems.map((article, index) => (
                    <div
                      key={article.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${(index % 6) * 0.06}s` }}
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
                  <div ref={loaderRef} className="flex justify-center py-6">
                    <Loader2 size={24} className="animate-spin text-muted-foreground" />
                  </div>
                )}

                {!hasMore && visibleItems.length > 0 && (
                  <p className="text-center text-caption text-muted-foreground py-6">
                    You've reached the end of the news feed
                  </p>
                )}
              </>
            )}
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <TrendingSection isBookmarked={isBookmarked} onToggleBookmark={toggleBookmark} />
            <CategoryHeatmap />
          </aside>
        </div>
      </main>
    </>
  );
}
