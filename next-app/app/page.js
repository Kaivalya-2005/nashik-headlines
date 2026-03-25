import BreakingBanner from '@/components/BreakingBanner';
import ArticleCard from '@/components/ArticleCard';
import TopNewsSlider from '@/components/TopNewsSlider';
import TrendingSection from '@/components/TrendingSection';
import { fetchArticles, fetchTrendingArticles } from '@/lib/api';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const revalidate = 300;

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

  return (
    <>
      <BreakingBanner articles={sorted} />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <TopNewsSlider articles={sorted.slice(0, 6)} />
        <div className="border-t border-border" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-bold text-title">Latest News</h2>
              <span className="text-overline text-muted-foreground">{sorted.length} articles</span>
            </div>

            {featured && <ArticleCard article={featured} variant="featured" />}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {rest.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <TrendingSection articles={trending} />
          </aside>
        </div>
      </main>
    </>
  );
}
