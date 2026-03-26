import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function BreakingBanner({ articles = [] }) {
  const breaking = articles.filter((a) => a.is_breaking || a.isBreaking);
  const items = (breaking.length ? breaking : articles).slice(0, 6);
  if (items.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 overflow-hidden">
      <div className="container mx-auto flex items-center h-10">
        <div className="flex items-center gap-2 px-4 flex-shrink-0 z-10">
          <div className="pulse-dot" />
          <AlertCircle size={13} className="text-white/90" />
          <span className="text-overline text-white font-bold tracking-widest">Breaking</span>
        </div>
        <div className="h-6 w-px bg-white/20 flex-shrink-0" />
        <div className="overflow-hidden flex-1">
          <div className="animate-ticker whitespace-nowrap">
            {items.map((article, i) => (
              <Link key={article.slug} href={`/news/${article.slug}`} className="inline-block text-white/95 text-sm font-medium hover:text-white hover:underline mx-8 transition-colors">
                {article.title}
                {i < items.length - 1 && <span className="mx-4 text-white/30">•</span>}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
