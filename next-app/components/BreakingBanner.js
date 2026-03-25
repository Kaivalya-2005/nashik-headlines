import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function BreakingBanner({ articles = [] }) {
  const breaking = articles.filter((a) => a.is_breaking || a.isBreaking);
  const items = (breaking.length ? breaking : articles).slice(0, 6);
  if (items.length === 0) return null;

  return (
    <div className="bg-accent overflow-hidden">
      <div className="container mx-auto flex items-center h-10">
        <div className="flex items-center gap-1.5 px-4 bg-accent flex-shrink-0 z-10">
          <AlertCircle size={13} className="text-accent-foreground" />
          <span className="text-overline text-accent-foreground uppercase tracking-widest">Breaking</span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="animate-ticker whitespace-nowrap">
            {items.map((article, i) => (
              <Link key={article.slug} href={`/news/${article.slug}`} className="inline-block text-accent-foreground text-sm font-medium hover:underline mx-8">
                {article.title}
                {i < items.length - 1 && <span className="mx-4 text-accent-foreground/40">•</span>}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
