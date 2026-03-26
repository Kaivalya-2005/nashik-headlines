"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { timeAgo } from '@/lib/format';

export default function TopNewsSlider({ articles }) {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);

  const items = articles?.slice(0, 6) || [];
  const count = items.length;

  if (count === 0) return null;

  const scrollToIndex = useCallback((index) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const child = container.children[index];
    if (child) {
      const scrollLeft = child.offsetLeft - container.offsetLeft;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
    setActiveIndex(index);
  }, []);

  const scroll = (direction) => {
    const nextIndex = direction === 'left'
      ? Math.max(0, activeIndex - 1)
      : Math.min(count - 1, activeIndex + 1);
    scrollToIndex(nextIndex);
  };

  // Auto-play
  useEffect(() => {
    if (isPaused || count <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % count;
        scrollToIndex(next);
        return next;
      });
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [isPaused, count, scrollToIndex]);

  // Track scroll position for dot indicators
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const onScroll = () => {
      const scrollLeft = container.scrollLeft;
      const childWidth = container.children[0]?.offsetWidth || 340;
      const gap = 16;
      const index = Math.round(scrollLeft / (childWidth + gap));
      setActiveIndex(Math.min(index, count - 1));
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [count]);

  return (
    <section
      className="relative -mx-4 px-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-headline font-bold text-title section-accent pb-2">Top Stories</h2>
          <p className="text-caption text-muted-foreground mt-1">Most read headlines right now</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full border border-border hover:bg-secondary hover:border-accent/30 transition-all duration-200"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full border border-border hover:bg-secondary hover:border-accent/30 transition-all duration-200"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory scroll-smooth">
        {items.map((article, idx) => {
          const cat = CATEGORIES.find((c) => c.slug === article.category);
          const isActive = idx === activeIndex;
          return (
            <Link key={article.slug} href={`/news/${article.slug}`} className={`flex-shrink-0 w-[280px] md:w-[340px] snap-start group transition-all duration-300 ${isActive ? 'scale-[1.02]' : 'scale-100 opacity-80'}`}>
              <div className={`relative rounded-xl overflow-hidden aspect-[16/9] transition-shadow duration-300 ${isActive ? 'shadow-elevated ring-2 ring-accent/20' : ''}`}>
                <Image
                  src={article.image || 'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=800&h=500&fit=crop'}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(min-width: 1024px) 340px, 280px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
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

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => scrollToIndex(idx)}
            className={`slide-dot ${idx === activeIndex ? 'active' : ''}`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
