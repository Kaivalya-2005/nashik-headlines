import Link from 'next/link';

function extractScoreFromTitle(title = '') {
  const scoreMatch = title.match(/(\b\d{1,3}\/\d{1,2}\b(?:\s*\([^)]+\))?)/);
  return scoreMatch ? scoreMatch[1] : null;
}

export default function CricketScoreCorner({ sportsArticles = [] }) {
  const items = sportsArticles.slice(0, 4).map((article, index) => ({
    slug: article.slug,
    title: article.title,
    score: extractScoreFromTitle(article.title),
    id: `${article.slug}-${index}`,
  }));

  return (
    <section className="border border-border p-4 bg-card">
      <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
        <h3 className="font-bold text-lg">Cricket Live</h3>
        <span className="text-[10px] font-semibold text-accent uppercase tracking-wide">Live</span>
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/news/${item.slug}`}
              className="block border-b border-border/60 pb-2 last:border-0 last:pb-0 hover:text-accent transition-colors"
            >
              <p className="text-base font-semibold leading-snug line-clamp-2">{item.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {item.score ? `Score: ${item.score}` : 'Score update in progress'}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No cricket updates available yet.</p>
        )}
      </div>
    </section>
  );
}
