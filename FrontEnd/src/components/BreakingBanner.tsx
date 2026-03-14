/**
 * BreakingBanner — animated ticker for breaking news from DB.
 */

import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useBreakingQuery } from "@/hooks/useNewsQuery";

export default function BreakingBanner() {
  const { data: breakingNews = [] } = useBreakingQuery();

  if (breakingNews.length === 0) return null;

  return (
    <div className="bg-accent overflow-hidden">
      <div className="container mx-auto flex items-center h-10">
        <div className="flex items-center gap-1.5 px-4 bg-accent flex-shrink-0 z-10">
          <AlertCircle size={13} className="text-accent-foreground" />
          <span className="text-overline text-accent-foreground uppercase tracking-widest">
            Breaking
          </span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="animate-ticker whitespace-nowrap">
            {breakingNews.map((article, i) => (
              <Link
                key={article.id}
                to={`/article/${article.id}`}
                className="inline-block text-accent-foreground text-sm font-medium hover:underline mx-8"
              >
                {article.headline}
                {i < breakingNews.length - 1 && (
                  <span className="mx-4 text-accent-foreground/40">•</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
