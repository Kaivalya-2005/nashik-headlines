import { notFound } from 'next/navigation';
import ArticleCard from '@/components/ArticleCard';
import { fetchArticlesByCategory } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import { Newspaper } from 'lucide-react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const cat = CATEGORIES.find((c) => c.slug === params.category);
  const title = cat ? `${cat.label} News` : 'News';
  const description = `Latest ${cat?.label?.toLowerCase() || 'news'} headlines.`;
  const canonical = `${siteUrl}/category/${params.category}`;

  return {
    title,
    description,
    keywords: cat ? `${cat.label}, Nashik, headlines` : 'news, Nashik headlines',
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
    },
  };
}

export default async function CategoryPage({ params }) {
  const articles = await fetchArticlesByCategory(params.category);
  const cat = CATEGORIES.find((c) => c.slug === params.category);

  if (!cat) {
    notFound();
  }

  return (
    <>
      {/* Category hero banner */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `linear-gradient(135deg, hsl(var(--category-${cat.slug})) 0%, transparent 60%)`,
          }}
        />
        <div className="container mx-auto px-4 py-10 md:py-14 relative">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${cat.colorClass} shadow-md`}>
              <Newspaper size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-headline font-bold text-display">{cat.label}</h1>
            </div>
          </div>
          <p className="text-body-lg text-muted-foreground max-w-lg">
            Latest headlines and stories from {cat.label}. Stay updated with the news that matters.
          </p>
          <span className="inline-block mt-3 text-overline text-muted-foreground">
            {articles.length} {articles.length === 1 ? 'article' : 'articles'} found
          </span>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {articles.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-5">
              <Newspaper size={28} className="text-muted-foreground" />
            </div>
            <h2 className="font-headline font-bold text-title mb-2">No articles yet</h2>
            <p className="text-muted-foreground text-body-lg max-w-md mx-auto">
              We don&apos;t have any articles in {cat.label} right now. Check back soon for the latest updates.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
            {articles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
