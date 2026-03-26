import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, ArrowLeft } from 'lucide-react';
import ArticleCard from '@/components/ArticleCard';
import ReadingProgress from '@/components/ReadingProgress';
import ShareButtons from '@/components/ShareButtons';
import ViewTracker from '@/components/ViewTracker';
import { fetchArticleBySlug, fetchRelatedArticles } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata({ params }) {
  const article = await fetchArticleBySlug(params.slug, { cache: 'no-store' });
  if (!article) {
    return { title: 'Article Not Found' };
  }

  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.description;
  const keywords = article.keywords || undefined;
  const canonical = `${siteUrl}/news/${article.slug}`;
  const ogImage = article.image
    ? article.image.startsWith('http')
      ? article.image
      : `${siteUrl}${article.image}`
    : undefined;

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      publishedTime: article.publishedAt,
      images: ogImage ? [{ url: ogImage }] : [],
    },
  };
}

export default async function ArticlePage({ params }) {
  const article = await fetchArticleBySlug(params.slug, { cache: 'no-store' });
  if (!article) notFound();

  const related = await fetchRelatedArticles(article);
  const cat = CATEGORIES.find((c) => c.slug === article.category);
  const ogImage = article.image
    ? article.image.startsWith('http')
      ? article.image
      : `${siteUrl}${article.image}`
    : undefined;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.seoDescription,
    image: ogImage ? [ogImage] : undefined,
    datePublished: article.publishedAt,
    author: { '@type': 'Organization', name: 'Nashik Headlines' },
    publisher: {
      '@type': 'Organization',
      name: 'Nashik Headlines',
      logo: { '@type': 'ImageObject', url: `${siteUrl}/favicon.ico` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl}/news/${article.slug}` },
    articleSection: cat?.label || 'News',
    keywords: article.keywords,
  };

  return (
    <>
      <ReadingProgress />
      <ViewTracker articleId={article.id} />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back to headlines
        </Link>

        <article className="animate-fade-in-up">
          {cat && <span className={`category-badge mb-5 ${cat.colorClass}`}>{cat.label}</span>}

          <h1 className="font-headline font-bold text-display mb-5">{article.title}</h1>
          <p className="text-body-lg text-muted-foreground leading-relaxed mb-5">{article.description}</p>

          {/* Glass meta card */}
          <div className="glass-card p-4 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center flex-wrap gap-4 text-caption text-muted-foreground">
                <span className="font-semibold text-foreground/70">Nashik Headlines</span>
                <span>{formatDate(article.publishedAt)}</span>
                <div className="flex items-center gap-1">
                  <Clock size={13} />
                  <span>{article.readTime} min read</span>
                </div>
              </div>
              <ShareButtons title={article.title} slug={article.slug} />
            </div>
          </div>

          <div className="w-full h-[320px] md:h-[420px] relative mb-10 rounded-xl overflow-hidden shadow-elevated">
            <Image
              src={article.image || 'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=800&h=500&fit=crop'}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 900px, 100vw"
              priority
            />
          </div>

          <div className="max-w-none space-y-5 text-body-lg leading-[1.8] text-foreground/85 drop-cap">
            {(article.content || '').split(/\n\n+/).map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>

          {/* Bottom share */}
          <div className="mt-10 pt-6 border-t border-border">
            <ShareButtons title={article.title} slug={article.slug} />
          </div>
        </article>

        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t border-border">
            <h2 className="font-headline font-bold text-title section-accent pb-2 mb-6">Related Articles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 stagger-children">
              {related.map((rel) => (
                <ArticleCard key={rel.slug} article={rel} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
