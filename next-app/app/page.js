import BreakingBanner from '@/components/BreakingBanner';
import ArticleCard from '@/components/ArticleCard';
import TrendingSection from '@/components/TrendingSection';
import MarketCorner from '@/components/MarketCorner';
import { fetchArticles, fetchTrendingArticles } from '@/lib/api';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const revalidate = 300;

const NSE_INDICES = [
  { symbol: 'NIFTY 50', label: 'NIFTY 50' },
  { symbol: 'NIFTY BANK', label: 'NIFTY BANK' },
  { symbol: 'NIFTY NEXT 50', label: 'NIFTY Next 50' },
  { symbol: 'NIFTY IT', label: 'NIFTY IT' },
  { symbol: 'NIFTY FIN SERVICE', label: 'NIFTY Financial Services' },
  { symbol: 'NIFTY MIDCAP 100', label: 'NIFTY Midcap 100' },
];

const GLOBAL_INDICES = [
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^DJI', label: 'Dow Jones' },
  { symbol: '^IXIC', label: 'NASDAQ' },
  { symbol: '^FTSE', label: 'FTSE 100' },
  { symbol: '^GDAXI', label: 'DAX' },
  { symbol: '^N225', label: 'Nikkei 225' },
  { symbol: '^HSI', label: 'Hang Seng' },
];

function normalizeYahooChartResponse(json) {
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) return null;

  const last = Number(meta.regularMarketPrice ?? meta.postMarketPrice ?? meta.preMarketPrice ?? meta.previousClose);
  const previousClose = Number(meta.previousClose);
  const rawChange = Number(meta.regularMarketChange);
  const rawPercentChange = Number(meta.regularMarketChangePercent);

  const change = Number.isFinite(rawChange)
    ? rawChange
    : Number.isFinite(last) && Number.isFinite(previousClose)
      ? last - previousClose
      : null;

  const percentChange = Number.isFinite(rawPercentChange)
    ? rawPercentChange
    : Number.isFinite(change) && Number.isFinite(previousClose) && previousClose !== 0
      ? (change / previousClose) * 100
      : null;

  return {
    last: Number.isFinite(last) ? last : null,
    change: Number.isFinite(change) ? change : null,
    percentChange: Number.isFinite(percentChange) ? percentChange : null,
  };
}

async function fetchYahooIndex(symbol, label) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=2m&range=1d&includePrePost=false&lang=en-US&region=US`;
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0',
        accept: 'application/json',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) return null;

    const json = await response.json();
    const normalized = normalizeYahooChartResponse(json);
    if (!normalized) return null;

    return {
      symbol,
      label,
      ...normalized,
    };
  } catch {
    return null;
  }
}

async function fetchNseMarketSnapshot() {
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

    return NSE_INDICES.map(({ symbol, label }) => pick(symbol, label)).filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchGlobalMarketSnapshot() {
  const results = await Promise.all(GLOBAL_INDICES.map(({ symbol, label }) => fetchYahooIndex(symbol, label)));
  return results.filter(Boolean);
}

async function fetchMarketSnapshot() {
  const [nse, global] = await Promise.all([fetchNseMarketSnapshot(), fetchGlobalMarketSnapshot()]);
  const combined = [...nse, ...global];
  const seen = new Set();

  return combined.filter((item) => {
    if (!item?.symbol || seen.has(item.symbol)) return false;
    seen.add(item.symbol);
    return true;
  });
}

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const q = params?.q;
  const title = q ? `"${q}" साठी शोध निकाल | नाशिक हेडलाईन्स` : 'नाशिक व महाराष्ट्रातील ताज्या बातम्या';
  const description = q
    ? `नाशिक हेडलाईन्सवर ${q} साठी शोध निकाल.`
    : 'नाशिक, शिर्डी, धुळे, मालेगाव, इगतपुरी आणि संपूर्ण महाराष्ट्रातील ताज्या बातम्या वाचा.';

  const canonical = q ? `${siteUrl}/?q=${encodeURIComponent(q)}` : siteUrl;

  return {
    title,
    description,
    keywords: 'नाशिक बातम्या, महाराष्ट्र बातम्या, नाशिक हेडलाईन्स, ब्रेकिंग न्यूज नाशिक',
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
  const params = await searchParams;
  const query = params?.q || '';
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
    name: 'नाशिक हेडलाईन्स',
    url: siteUrl,
    logo: `${siteUrl}/logo.jpeg`,
    sameAs: [],
    description: 'नाशिक, महाराष्ट्रातील ब्रेकिंग न्यूजसाठी आपला विश्वासू स्रोत.',
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
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-7 bg-accent rounded-full" />
                  <h2 className="font-headline text-2xl md:text-3xl font-bold">ताज्या बातम्या</h2>
                </div>
                <span className="text-sm text-muted-foreground font-medium">{sorted.length} बातम्या</span>
              </div>

              {featured ? <ArticleCard article={featured} variant="featured" /> : null}

              {rest.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {rest.map((article) => (
                    <ArticleCard key={article.slug} article={article} />
                  ))}
                </div>
              ) : !featured ? (
                <p className="text-base text-muted-foreground py-8">सध्या बातम्या उपलब्ध नाहीत.</p>
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
