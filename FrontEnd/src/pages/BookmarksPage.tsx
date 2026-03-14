/**
 * BookmarksPage — shows all bookmarked articles from DB.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useBookmarks } from "@/hooks/useBookmarks";
import { fetchArticleById } from "@/services/articleService";
import { Article } from "@/types/news";
import NewsCard from "@/components/NewsCard";
import { Bookmark } from "lucide-react";
import SEOHead from "@/components/SEOHead";

export default function BookmarksPage() {
  const { bookmarks, isBookmarked, toggleBookmark } = useBookmarks();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const results = await Promise.all(
        bookmarks.map((id) => fetchArticleById(id))
      );
      setArticles(results.filter(Boolean) as Article[]);
      setLoading(false);
    })();
  }, [bookmarks]);

  return (
    <>
      <SEOHead title="Bookmarks" canonicalPath="/bookmarks" />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-headline font-bold text-display">Bookmarks</h1>
          <p className="text-body-lg text-muted-foreground mt-1">
            {articles.length} saved article{articles.length !== 1 ? "s" : ""}
          </p>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-10">Loading bookmarks...</p>
        ) : articles.length === 0 ? (
          <div className="py-20 text-center">
            <Bookmark size={48} className="mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-body-lg text-muted-foreground mb-4">No bookmarks yet.</p>
            <Link to="/" className="text-accent hover:underline text-caption font-medium">
              ← Browse headlines
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((article, index) => (
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
        )}
      </main>
    </>
  );
}
