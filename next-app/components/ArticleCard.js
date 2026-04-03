import Image from 'next/image';
import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';
import { timeAgo } from '@/lib/format';

export default function ArticleCard({ article, variant = 'default' }) {
  const cat = CATEGORIES.find((c) => c.slug === article.category);
  const href = `/news/${article.slug}`;

  if (variant === 'featured') {
    return (
      <article className="news-card border-b border-border pb-4 mb-4">
        <Link href={href} className="block">
          <div className="relative mb-3">
            <div className="aspect-[16/9] overflow-hidden relative">
              <Image
                src={article.image || 'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=800&h=500&fit=crop'}
                alt={article.title}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 800px, 100vw"
                priority
              />
            </div>
          </div>
          <div className="px-1">
            <div className="flex items-center gap-2 mb-2">
              {cat && <span className={`category-badge ${cat.colorClass}`}>{cat.label}</span>}
              {article.isBreaking && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[11px] font-bold uppercase">
                  <span className="w-1.5 h-1.5 bg-white animate-pulse" />
                  Breaking
                </span>
              )}
            </div>
            <h2 className="font-bold text-2xl leading-tight mb-2 headline-link hover:text-accent transition-colors">{article.title}</h2>
            <p className="text-muted-foreground text-base leading-relaxed line-clamp-3 mb-3">{article.description}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Nashik Headlines</span>
                <span>·</span>
                <span>{timeAgo(article.publishedAt)}</span>
              </div>
              <span>{article.readTime} min read</span>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="news-card border-b border-border pb-4 mb-4 hover:bg-secondary/50 transition-colors p-0">
      <Link href={href} className="block">
        <div className="grid grid-cols-3 gap-3 p-2">
          <div className="col-span-2 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              {cat && <span className={`category-badge text-xs ${cat.colorClass}`}>{cat.label}</span>}
            </div>
            <h3 className="font-bold text-base leading-snug mb-1 line-clamp-2 headline-link hover:text-accent">{article.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-2">{article.description}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="font-medium">Nashik Headlines</span>
                <span>·</span>
                <span>{timeAgo(article.publishedAt)}</span>
              </div>
            </div>
          </div>
          <div className="col-span-1 aspect-[4/3] overflow-hidden relative min-h-24">
            <Image
              src={article.image || 'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=800&h=500&fit=crop'}
              alt={article.title}
              fill
              className="object-cover"
              sizes="200px"
            />
          </div>
        </div>
      </Link>
    </article>
  );
}
