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
    return { title: 'लेख सापडला नाही' };
  }

  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.description;
  const keywords = [article.keywords, ...(article.tags || [])].filter(Boolean).join(', ') || undefined;
  const canonical = `${siteUrl}/news/${article.slug}`;
  const heroImage = article.image || article.images?.find((img) => img.isFeatured)?.url || article.images?.[0]?.url;
  const ogImage = heroImage
    ? heroImage.startsWith('http')
      ? heroImage
      : `${siteUrl}${heroImage}`
    : undefined;

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      publishedTime: article.publishedAt,
      tags: article.tags || [],
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function ArticlePage({ params }) {
  const article = await fetchArticleBySlug(params.slug, { cache: 'no-store' });
  if (!article) notFound();

  const related = await fetchRelatedArticles(article);
  const cat = CATEGORIES.find((c) => c.slug === article.category);
  const heroImage = article.image || article.images?.find((img) => img.isFeatured)?.url || article.images?.[0]?.url;
  const featuredFromList = article.images?.find((img) => img.isFeatured) || article.images?.[0] || null;
  const inlineImages = (article.images || []).filter((img) => img?.url && img.url !== featuredFromList?.url);
  const rawContent = String(article.content || '');
  const ogImage = heroImage
    ? heroImage.startsWith('http')
      ? heroImage
      : `${siteUrl}${heroImage}`
    : undefined;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.seoDescription,
    image: ogImage ? [ogImage] : undefined,
    datePublished: article.publishedAt,
    author: { '@type': 'Organization', name: 'नाशिक हेडलाईन्स' },
    publisher: {
      '@type': 'Organization',
      name: 'नाशिक हेडलाईन्स',
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
          मुख्यपानावर परत
        </Link>

        <article className="animate-fade-in-up">
          {cat && <span className={`category-badge mb-5 ${cat.colorClass}`}>{cat.label}</span>}

          <h1 className="font-headline font-bold text-display mb-5">{article.title}</h1>
          <p className="text-body-lg text-muted-foreground leading-relaxed mb-5">{article.description}</p>

          {/* Glass meta card */}
          <div className="glass-card p-4 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center flex-wrap gap-4 text-caption text-muted-foreground">
                <span className="font-semibold text-foreground/70">नाशिक हेडलाईन्स</span>
                <span>{formatDate(article.publishedAt)}</span>
                <div className="flex items-center gap-1">
                  <Clock size={13} />
                  <span>{article.readTime} मिनिट वाचन</span>
                </div>
              </div>
              <ShareButtons title={article.title} slug={article.slug} canonicalUrl={`${siteUrl}/news/${article.slug}`} />
            </div>
          </div>

          {heroImage && (
            <figure className="w-full relative mb-10 rounded-2xl overflow-hidden shadow-elevated border border-border bg-card/60">
              <div className="relative w-full aspect-[16/9]">
              <Image
                src={heroImage}
                alt={article.imageAlt || article.title}
                fill
                className="object-cover object-center"
                sizes="(min-width: 1024px) 900px, 100vw"
                priority
              />
              </div>
            </figure>
          )}

          <div
            className="article-content drop-cap"
            dangerouslySetInnerHTML={{ __html: rawContent }}
          />

          {inlineImages.length > 0 && (
            <div className="mt-6 space-y-4">
              {inlineImages.map((img, idx) => (
                <figure key={idx} className="rounded-xl overflow-hidden border border-border bg-card/60 shadow-sm">
                  <div className="relative aspect-[16/9]">
                    <Image
                      src={img.url}
                      alt={img.altText || article.title}
                      fill
                      className="object-cover object-center"
                      sizes="(min-width: 1024px) 900px, 100vw"
                    />
                  </div>
                  {img.caption && (
                    <figcaption className="px-3 py-2 text-sm text-muted-foreground">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}

          {article.tags?.length > 0 && (
            <section className="mt-10 pt-6 border-t border-border">
              <h2 className="font-headline font-bold text-title mb-4">टॅग्स</h2>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full border border-border bg-secondary/40 text-sm text-foreground/80"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </section>
          )}
        </article>

        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t border-border">
            <h2 className="font-headline font-bold text-title section-accent pb-2 mb-6">संबंधित बातम्या</h2>
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
