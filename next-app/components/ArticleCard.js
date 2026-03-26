import Image from 'next/image';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import { timeAgo } from '@/lib/format';

export default function ArticleCard({ article, variant = 'default' }) {
  const cat = CATEGORIES.find((c) => c.slug === article.category);
  const href = `/news/${article.slug}`;

  if (variant === 'featured') {
    return (
      <article className="news-card relative group">
        <Link href={href} className="block">
          <div className="relative">
            <div className="aspect-[16/9] overflow-hidden relative">
              <Image
                src={article.image || 'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=800&h=500&fit=crop'}
                alt={article.title}
                fill
                className="object-cover card-image"
                sizes="(min-width: 1024px) 800px, 100vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          </div>
          <div className="p-5 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              {cat && <span className={`category-badge ${cat.colorClass}`}>{cat.label}</span>}
              {article.isBreaking && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[11px] font-semibold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Breaking
                </span>
              )}
            </div>
            <h2 className="font-headline font-bold text-title-lg leading-tight mb-2.5 headline-link group-hover:text-accent transition-colors duration-200">{article.title}</h2>
            <p className="text-muted-foreground text-body leading-relaxed line-clamp-2 mb-4">{article.description}</p>
            <div className="flex items-center justify-between text-caption text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground/70">Nashik Headlines</span>
                <span className="text-muted-foreground/40">·</span>
                <span>{timeAgo(article.publishedAt)}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground/60">
                <Clock size={12} />
                <span>{article.readTime} min read</span>
              </div>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="news-card relative group">
      <Link href={href} className="block">
        <div className="aspect-[16/10] overflow-hidden relative">
          <Image
            src={article.image || 'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=800&h=500&fit=crop'}
            alt={article.title}
            fill
            className="object-cover card-image"
            sizes="(min-width: 768px) 400px, 100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2.5">
            {cat && <span className={`category-badge ${cat.colorClass}`}>{cat.label}</span>}
          </div>
          <h3 className="font-headline font-semibold text-base leading-snug mb-1.5 line-clamp-2 headline-link group-hover:text-accent transition-colors duration-200">{article.title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-3">{article.description}</p>
          <div className="flex items-center justify-between text-caption text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground/60">Nashik Headlines</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{timeAgo(article.publishedAt)}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground/50">
              <Clock size={11} />
              <span>{article.readTime}m</span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
