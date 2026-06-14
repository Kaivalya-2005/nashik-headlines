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

/**
 * Distribute images evenly between article sections by inserting <figure> blocks
 * after </h2> anchor points (or </p> if no h2 found).
 */
function injectImagesIntoContent(html, images) {
  if (!images?.length || !html) return html;

  // Collect injection points after </h2> or </p>
  const h2Regex = /<\/h2>/gi;
  const anchors = [];
  let m;
  while ((m = h2Regex.exec(html)) !== null) anchors.push(m.index + m[0].length);

  if (anchors.length === 0) {
    const pRegex = /<\/p>/gi;
    while ((m = pRegex.exec(html)) !== null) anchors.push(m.index + m[0].length);
  }

  if (anchors.length === 0) return html;

  const step = Math.max(1, Math.floor(anchors.length / (images.length + 1)));
  const insertions = images.map((img, i) => ({
    pos: anchors[Math.min(step * (i + 1), anchors.length - 1)],
    html: `<figure class="article-image my-6 rounded-xl overflow-hidden border border-border bg-card/60 shadow-sm">` +
      `<img src="${img.url}" alt="${(img.altText || '').replace(/"/g, '&quot;')}" loading="lazy" style="width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;" />` +
      (img.caption ? `<figcaption class="px-3 py-2 text-sm text-muted-foreground">${img.caption}</figcaption>` : '') +
      `</figure>`,
  }));

  // Insert from end so earlier positions aren't shifted
  insertions.sort((a, b) => b.pos - a.pos);
  let result = html;
  for (const { pos, html: block } of insertions) {
    result = result.slice(0, pos) + block + result.slice(pos);
  }
  return result;
}

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
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
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
  const rawContent = injectImagesIntoContent(String(article.content || ''), inlineImages);
  const ogImage = heroImage
    ? heroImage.startsWith('http')
      ? heroImage
      : `${siteUrl}${heroImage}`
    : undefined;
  const wordCountEst = String(article.content || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const readingMins = Math.max(1, Math.round(wordCountEst / 200));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.seoDescription || article.description,
    image: ogImage ? [{ '@type': 'ImageObject', url: ogImage, width: 1200, height: 630 }] : undefined,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      '@type': 'Organization',
      name: 'नाशिक हेडलाईन्स',
      url: siteUrl,
    },
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: 'नाशिक हेडलाईन्स',
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
        width: 600,
        height: 60,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/news/${article.slug}`,
    },
    articleSection: cat?.label || 'बातम्या',
    keywords: article.keywords || (article.tags || []).join(', '),
    wordCount: wordCountEst,
    timeRequired: `PT${readingMins}M`,
    inLanguage: 'mr',
    isAccessibleForFree: true,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '.article-content h2', '.article-content p:first-of-type'],
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'मुख्यपान', item: siteUrl },
      ...(cat ? [{ '@type': 'ListItem', position: 2, name: cat.label, item: `${siteUrl}/category/${cat.slug}` }] : []),
      { '@type': 'ListItem', position: cat ? 3 : 2, name: article.title, item: `${siteUrl}/news/${article.slug}` },
    ],
  };

  return (
    <>
      <ReadingProgress />
      <ViewTracker articleId={article.id} />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

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
