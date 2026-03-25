import Image from 'next/image';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { timeAgo } from '@/lib/format';

export default function TrendingSection({ articles = [] }) {
  if (!articles.length) return null;

  return (
    <section className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-1.5 rounded-lg bg-trending/10">
          <TrendingUp size={16} className="text-trending" />
        </div>
        <h2 className="font-headline font-bold text-title">Trending</h2>
      </div>

      <div className="space-y-0.5">
        {articles.map((article, index) => (
          <Link
            key={article.slug}
            href={`/news/${article.slug}`}
            className="flex items-start gap-3 p-2.5 -mx-2.5 rounded-lg hover:bg-secondary/60 transition-colors group"
          >
            <span className="text-2xl font-headline font-bold text-muted-foreground/25 leading-none mt-1 w-7 text-center flex-shrink-0 group-hover:text-accent/50 transition-colors">
              {index + 1}
            </span>
            <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={article.image || 'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=800&h=500&fit=crop'}
                alt={article.title}
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
            <div className="flex-1 min-w-0 py-0.5">
              <h3 className="font-headline font-semibold text-sm leading-snug line-clamp-2 headline-link">{article.title}</h3>
              <div className="flex items-center gap-1.5 mt-1.5 text-overline text-muted-foreground">
                <span>Nashik Headlines</span>
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
