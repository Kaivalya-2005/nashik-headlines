/**
 * TopNewsSlider — premium horizontal carousel for top stories.
 * Features smooth scrolling, gradient overlays, and subtle controls.
 */

import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Article, CATEGORIES } from "@/types/news";
import { timeAgo } from "@/utils/formatDate";

interface TopNewsSliderProps {
  articles: Article[];
}

export default function TopNewsSlider({ articles }: TopNewsSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (articles.length === 0) return null;

  return (
    <section className="relative -mx-4 px-4">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-headline font-bold text-title">Top Stories</h2>
          <p className="text-caption text-muted-foreground mt-0.5">
            Most read headlines right now
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => scroll("left")}
            className="p-2 rounded-full border border-border hover:bg-secondary transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-2 rounded-full border border-border hover:bg-secondary transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable track */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory scroll-smooth"
      >
        {articles.slice(0, 6).map((article) => {
          const catInfo = CATEGORIES.find((c) => c.slug === article.category);
          return (
            <Link
              key={article.id}
              to={`/article/${article.id}`}
              className="flex-shrink-0 w-[280px] md:w-[340px] snap-start group"
            >
              <div className="relative rounded-xl overflow-hidden aspect-[16/9]">
                <img
                  src={article.imageUrl}
                  alt={article.headline}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                {/* Gradient overlay — bottom heavy for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                {/* Category badge */}
                {catInfo && (
                  <span className={`category-badge absolute top-3 left-3 ${catInfo.colorClass}`}>
                    {catInfo.label}
                  </span>
                )}

                {/* Text overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-headline font-bold text-white text-sm md:text-base leading-snug line-clamp-2 mb-1.5 drop-shadow-lg">
                    {article.headline}
                  </h3>
                  <div className="flex items-center gap-1.5 text-white/70 text-overline">
                    <span>{article.source}</span>
                    <span className="text-white/40">·</span>
                    <span>{timeAgo(article.publishedAt)}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
