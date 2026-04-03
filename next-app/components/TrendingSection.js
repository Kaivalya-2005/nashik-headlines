import Image from 'next/image';
import Link from 'next/link';
import { timeAgo } from '@/lib/format';

export default function TrendingSection({ articles = [] }) {
  if (!articles.length) return null;

  return (
    <section className="bg-card border border-border">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <h2 className="font-bold text-xl">Trending</h2>
        <p className="text-sm text-muted-foreground mt-1">Most read right now</p>
      </div>

      <div className="p-0">
        {articles.map((article, index) => (
          <Link
            key={article.slug}
            href={`/news/${article.slug}`}
            className="flex items-start gap-3 p-3 border-b border-border/50 last:border-b-0 hover:bg-secondary/50 transition-colors"
          >
            <span className="flex items-center justify-center w-6 h-6 bg-accent text-white text-xs font-bold flex-shrink-0 rounded-sm">
              {index + 1}
            </span>
            <div className="relative w-12 h-12 overflow-hidden flex-shrink-0">
              <Image
                src={article.image || 'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=800&h=500&fit=crop'}
                alt={article.title}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight line-clamp-2 headline-link hover:text-accent transition-colors">{article.title}</h3>
              <div className="text-sm text-muted-foreground mt-1">
                {timeAgo(article.publishedAt)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
