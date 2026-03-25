import { fetchArticles } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';

export default async function sitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const articles = await fetchArticles({}, { revalidate: 60 });

  const staticUrls = [
    {
      url: siteUrl,
      lastModified: new Date(),
    },
    ...CATEGORIES.map((cat) => ({
      url: `${siteUrl}/category/${cat.slug}`,
      lastModified: new Date(),
    })),
  ];

  const articleUrls = articles.map((article) => ({
    url: `${siteUrl}/news/${article.slug}`,
    lastModified: article.publishedAt ? new Date(article.publishedAt) : new Date(),
  }));

  return [...staticUrls, ...articleUrls];
}
