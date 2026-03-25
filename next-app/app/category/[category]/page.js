import { notFound } from 'next/navigation';
import ArticleCard from '@/components/ArticleCard';
import { fetchArticlesByCategory } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';

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
    <main className="container mx-auto px-4 py-8 space-y-6">
      <div className="mb-4">
        <h1 className="font-headline font-bold text-display">{cat.label}</h1>
        <p className="text-body-lg text-muted-foreground mt-1">Latest headlines from {cat.label}</p>
      </div>

      {articles.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center text-body-lg">No articles found in this category.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      )}
    </main>
  );
}
