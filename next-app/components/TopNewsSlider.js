"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { timeAgo } from '@/lib/format';

export default function TopNewsSlider({ articles }) {
  const scrollRef = useRef(null);

  if (!articles || articles.length === 0) return null;

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="relative -mx-4 px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-headline font-bold text-title">Top Stories</h2>
          <p className="text-caption text-muted-foreground mt-0.5">Most read headlines right now</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full border border-border hover:bg-secondary transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full border border-border hover:bg-secondary transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory scroll-smooth">
        {articles.slice(0, 6).map((article) => {
          const cat = CATEGORIES.find((c) => c.slug === article.category);
          return (
            <Link key={article.slug} href={`/news/${article.slug}`} className="flex-shrink-0 w-[280px] md:w-[340px] snap-start group">
              <div className="relative rounded-xl overflow-hidden aspect-[16/9]">
                <Image
                  src={article.image || 'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=800&h=500&fit=crop'}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(min-width: 1024px) 340px, 280px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                {cat && <span className={`category-badge absolute top-3 left-3 ${cat.colorClass}`}>{cat.label}</span>}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-headline font-bold text-white text-sm md:text-base leading-snug line-clamp-2 mb-1.5 drop-shadow-lg">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-white/70 text-overline">
                    <span>Nashik Headlines</span>
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
