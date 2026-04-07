import BreakingBanner from '@/components/BreakingBanner';
import ArticleCard from '@/components/ArticleCard';
import TrendingSection from '@/components/TrendingSection';
import MarketCorner from '@/components/MarketCorner';
import { fetchArticles, fetchTrendingArticles } from '@/lib/api';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const revalidate = 300;

async function fetchMarketSnapshot() {
  try {
    const response = await fetch('https://www.nseindia.com/api/allIndices', {
      headers: {
        'user-agent': 'Mozilla/5.0',
        accept: 'application/json',
        referer: 'https://www.nseindia.com/',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) return [];

    const json = await response.json();
    const rows = Array.isArray(json?.data) ? json.data : [];

    const pick = (symbol, label) => {
      const found = rows.find((item) => item.indexSymbol === symbol || item.index === symbol);
      if (!found) return null;
      return {
        symbol,
        label,
        last: Number(found.last),
        change: Number(found.variation),
        percentChange: Number(found.percentChange),
      };
    };

    return [
      pick('NIFTY 50', 'NIFTY 50'),
      pick('NIFTY BANK', 'NIFTY BANK'),
    ].filter(Boolean);
  } catch {
    return [];
  }
}

export async function generateMetadata({ searchParams }) {
  const q = searchParams?.q;
  const title = q ? `Search results for "${q}" | Nashik Headlines` : 'Latest News from Nashik & Maharashtra';
  const description = q
    ? `Search results for ${q} on Nashik Headlines.`
    : 'Get the latest news headlines from Nashik, Shirdi, Dhule, Malegaon, Igatpuri and all of Maharashtra.';

  const canonical = q ? `${siteUrl}/?q=${encodeURIComponent(q)}` : siteUrl;

  return {
    title,
    description,
    keywords: 'Nashik news, Maharashtra news, Nashik headlines, breaking news Nashik',
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Nashik Headlines',
      type: 'website',
    },
  };
}

export default async function Home({ searchParams }) {
  const query = searchParams?.q || '';
  const articles = await fetchArticles({ query });
  const sorted = [...articles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const [featured, ...rest] = sorted;
  const trending = await fetchTrendingArticles(5);
  const marketData = await fetchMarketSnapshot();

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Nashik Headlines',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: 'Nashik Headlines',
    url: siteUrl,
    logo: `${siteUrl}/logo.jpeg`,
    sameAs: [],
    description: 'Your trusted source for breaking news from Nashik, Maharashtra.',
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <BreakingBanner articles={sorted} />

      {/* Hero section - removed for BBC-like simplicity */}

      <main className="w-full py-4 md:py-6">
        <div className="max-w-[1450px] mx-auto px-3 md:px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className="lg:col-span-8 border border-border bg-card p-3 md:p-4">
              <div className="flex items-end justify-between mb-4 border-b border-border pb-3">
                <h2 className="font-headline text-2xl md:text-3xl font-bold">Latest News</h2>
                <span className="text-sm text-muted-foreground font-medium">{sorted.length} stories</span>
              </div>

              {featured ? <ArticleCard article={featured} variant="featured" /> : null}

              {rest.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {rest.map((article) => (
                    <ArticleCard key={article.slug} article={article} />
                  ))}
                </div>
              ) : !featured ? (
                <p className="text-base text-muted-foreground py-8">No news available right now.</p>
              ) : null}
            </section>

            <aside className="lg:col-span-4 space-y-4">
              <TrendingSection articles={trending} />
              <MarketCorner marketData={marketData} />
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
