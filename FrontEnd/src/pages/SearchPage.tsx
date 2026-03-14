/**
 * SearchPage — search results from DB.
 */

import { useSearchParams, Link } from "react-router-dom";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useNewsQuery } from "@/hooks/useNewsQuery";
import SEOHead from "@/components/SEOHead";
import NewsCard from "@/components/NewsCard";
import NewsCardSkeleton from "@/components/NewsCardSkeleton";
import { Search } from "lucide-react";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const { data: results = [], isLoading } = useNewsQuery(undefined, query || undefined);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  return (
    <>
      <SEOHead
        title={query ? `Search: ${query}` : "Search"}
        description={`Search results for "${query}" on Nashik Headlines.`}
        canonicalPath={`/search${query ? `?q=${encodeURIComponent(query)}` : ""}`}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-headline font-bold text-display mb-2">Search Results</h1>
          {query && !isLoading && (
            <p className="text-body-lg text-muted-foreground">
              {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
            </p>
          )}
        </div>

        {!query ? (
          <div className="py-20 text-center">
            <Search size={48} className="mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-body-lg text-muted-foreground">Enter a search term to find news.</p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-body-lg text-muted-foreground mb-4">No articles match your search.</p>
            <Link to="/" className="text-accent hover:underline text-caption font-medium">← Back to headlines</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((article, index) => (
              <div key={article.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                <NewsCard
                  article={article}
                  isBookmarked={isBookmarked(article.id)}
                  onToggleBookmark={toggleBookmark}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
