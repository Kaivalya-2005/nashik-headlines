/**
 * TrendingSection — shows top viewed articles from DB.
 */

import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { timeAgo } from "@/utils/formatDate";
import { useTrendingQuery } from "@/hooks/useNewsQuery";

interface TrendingSectionProps {
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
}

export default function TrendingSection({ isBookmarked, onToggleBookmark }: TrendingSectionProps) {
  const { data: trending = [] } = useTrendingQuery(5);

  if (trending.length === 0) {
    return null;
  }

  return (
    <section className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-1.5 rounded-lg bg-trending/10">
          <TrendingUp size={16} className="text-trending" />
        </div>
        <h2 className="font-headline font-bold text-title">Trending</h2>
      </div>

      <div className="space-y-0.5">
        {trending.map((article, index) => (
          <Link
            key={article.id}
            to={`/article/${article.id}`}
            className="flex items-start gap-3 p-2.5 -mx-2.5 rounded-lg hover:bg-secondary/60 transition-colors group"
          >
            <span className="text-2xl font-headline font-bold text-muted-foreground/25 leading-none mt-1 w-7 text-center flex-shrink-0 group-hover:text-accent/50 transition-colors">
              {index + 1}
            </span>
            <img
              src={article.imageUrl}
              alt={article.headline}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              loading="lazy"
            />
            <div className="flex-1 min-w-0 py-0.5">
              <h3 className="font-headline font-semibold text-sm leading-snug line-clamp-2 headline-link">
                {article.headline}
              </h3>
              <div className="flex items-center gap-1.5 mt-1.5 text-overline text-muted-foreground">
                <span>{article.source}</span>
                <span className="text-muted-foreground/40">·</span>
                <span>{timeAgo(article.publishedAt)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
