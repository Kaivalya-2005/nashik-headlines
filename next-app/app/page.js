import BreakingBanner from '@/components/BreakingBanner';
import ArticleCard from '@/components/ArticleCard';
import TopNewsSlider from '@/components/TopNewsSlider';
import TrendingSection from '@/components/TrendingSection';
import { fetchArticles, fetchTrendingArticles } from '@/lib/api';
import { Newspaper } from 'lucide-react';

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

      {/* Hero section */}
      {!query && (
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-accent/3 to-highlight/5 border-b border-border/50">
          <div className="container mx-auto px-4 py-10 md:py-14">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Newspaper size={20} className="text-primary" />
              </div>
              <h1 className="font-headline font-bold text-display text-gradient">Nashik Headlines</h1>
            </div>
            <p className="text-body-lg text-muted-foreground max-w-xl">
              Your trusted source for breaking news, local stories, and in-depth coverage from Nashik and Maharashtra.
            </p>
          </div>
          {/* Decorative dots */}
          <div className="absolute top-4 right-8 w-24 h-24 bg-accent/5 rounded-full blur-3xl" />
          <div className="absolute bottom-2 right-1/3 w-16 h-16 bg-primary/5 rounded-full blur-2xl" />
        </section>
      )}

      <main className="container mx-auto px-4 py-8 space-y-8">
        <TopNewsSlider articles={sorted.slice(0, 6)} />

        {/* Decorative divider */}
        <div className="relative">
          <div className="border-t border-border" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-background">
            <div className="w-2 h-2 rounded-full bg-accent/40" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-bold text-title section-accent pb-2">Latest News</h2>
              <span className="text-overline text-muted-foreground">{sorted.length} articles</span>
            </div>

            {featured && <ArticleCard article={featured} variant="featured" />}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 stagger-children">
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
