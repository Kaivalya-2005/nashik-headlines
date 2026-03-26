import Image from 'next/image';
import Link from 'next/link';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { timeAgo } from '@/lib/format';

const RANK_STYLES = [
  'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md shadow-amber-500/20',   // Gold
  'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-md shadow-slate-400/20',      // Silver
  'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-500/20',   // Bronze
];

export default function TrendingSection({ articles = [] }) {
  if (!articles.length) return null;

  return (
    <section className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header with gradient accent */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-5 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/20">
            <TrendingUp size={16} className="text-white" />
          </div>
          <div>
            <h2 className="font-headline font-bold text-title">Trending</h2>
            <p className="text-overline text-muted-foreground mt-0.5">Most popular right now</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-0.5">
        {articles.map((article, index) => (
          <Link
            key={article.slug}
            href={`/news/${article.slug}`}
            className="flex items-start gap-3 p-2.5 -mx-2.5 rounded-lg hover:bg-secondary/60 transition-all duration-200 group"
          >
            <span className={`flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold flex-shrink-0 mt-0.5 transition-transform duration-200 group-hover:scale-110 ${
              index < 3
                ? RANK_STYLES[index]
                : 'bg-muted text-muted-foreground'
            }`}>
              {index + 1}
            </span>
            <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
              <Image
                src={article.image || 'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=800&h=500&fit=crop'}
                alt={article.title}
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
            <div className="flex-1 min-w-0 py-0.5">
              <h3 className="font-headline font-semibold text-sm leading-snug line-clamp-2 headline-link group-hover:text-accent transition-colors duration-200">{article.title}</h3>
              <div className="flex items-center gap-1.5 mt-1.5 text-overline text-muted-foreground">
                <span>Nashik Headlines</span>
                <span className="text-muted-foreground/40">·</span>
                <span>{timeAgo(article.publishedAt)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* View all link */}
      <div className="px-5 pb-4">
        <Link
          href="/"
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg border border-border text-caption font-medium text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-accent/30 transition-all duration-200 group"
        >
          View all trending
          <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
