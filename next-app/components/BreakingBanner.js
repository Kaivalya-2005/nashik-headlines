import Link from 'next/link';

export default function BreakingBanner({ articles = [] }) {
  const breaking = articles.filter((a) => a.is_breaking || a.isBreaking);
  const items = (breaking.length ? breaking : articles).slice(0, 6);
  if (items.length === 0) return null;

  return (
    <div className="bg-red-600 overflow-hidden">
      <div className="max-w-[1450px] mx-auto flex items-center h-11 px-3 md:px-4">
        <div className="flex items-center gap-2 flex-shrink-0 z-10">
          <div className="pulse-dot" />
          <span className="text-sm text-white font-bold tracking-widest">BREAKING</span>
        </div>
        <div className="h-6 w-px bg-white/20 flex-shrink-0 mx-3" />
        <div className="overflow-hidden flex-1">
          <div className="animate-ticker whitespace-nowrap">
            {items.map((article) => (
              <Link
                key={article.slug}
                href={`/news/${article.slug}`}
                className="inline-block text-white text-sm font-medium hover:underline mx-8 transition-colors"
              >
                {article.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
