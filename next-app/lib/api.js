import { estimateReadTime } from '@/lib/format';

function resolveApiBase() {
  const internal = String(process.env.INTERNAL_API_BASE_URL || '').trim();
  const isLocalInternal = /localhost|127\.0\.0\.1/.test(internal);
  if (internal && !(process.env.VERCEL_URL && isLocalInternal)) {
    return internal;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

const MEDIA_BASE =
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:5000';
const FALLBACK_IMAGE = '/placeholder-news.svg';

function resolveApiBases() {
  const candidates = [
    resolveApiBase(),
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  ];

  return [...new Set(candidates.map((value) => String(value || '').trim().replace(/\/$/, '')).filter(Boolean))];
}

function buildApiUrl(base, path) {
  return `${base}${path}`;
}

function isRenderableImageUrl(url = '') {
  const value = String(url || '').trim();
  if (!value) return false;
  if (value.startsWith('blob:') || value.startsWith('data:')) return false;
  if (value.startsWith('http://') || value.startsWith('https://')) return true;
  if (value.startsWith('/')) return true;
  return false;
}

function normalizeImageUrl(url = '') {
  const value = String(url || '').trim();
  if (!value) return '';
  if (value.startsWith('/uploads/')) return `${MEDIA_BASE}${value}`;
  if (value.startsWith('uploads/')) return `${MEDIA_BASE}/${value}`;
  if (value.startsWith('//')) return `https:${value}`;
  return value;
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const message = `Request failed: ${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  return res.json();
}

function mapArticle(raw) {
  const content = raw.content || '';
  const summary = raw.meta_description || raw.seo_description || raw.description || content.slice(0, 180);
  let images = [];

  if (Array.isArray(raw.images)) {
    images = raw.images;
  } else if (typeof raw.images === 'string') {
    try {
      const parsed = JSON.parse(raw.images);
      images = Array.isArray(parsed) ? parsed : [];
    } catch {
      images = [];
    }
  }

  const normalizedImages = images
    .map((img) => ({ ...img, url: normalizeImageUrl(img?.url) }))
    .filter((img) => isRenderableImageUrl(img?.url))
    .map((img, idx) => ({
      id: img.id || `${raw.id}-${idx}`,
      url: img.url,
      caption: img.caption || '',
      altText: img.altText || img.alt_text || '',
      isFeatured: Boolean(img.isFeatured ?? img.is_featured ?? idx === 0),
    }));

  const heroImageCandidate = normalizeImageUrl(raw.image_url || raw.imageUrl);
  const heroImage = isRenderableImageUrl(heroImageCandidate)
    ? heroImageCandidate
    : normalizedImages.find((img) => img?.isFeatured)?.url || normalizedImages[0]?.url || FALLBACK_IMAGE;
  const parsedTags = (() => {
    if (!raw.tags) return [];
    if (Array.isArray(raw.tags)) return raw.tags.map((tag) => String(tag).trim()).filter(Boolean);
    if (typeof raw.tags === 'string') {
      try {
        const decoded = JSON.parse(raw.tags);
        if (Array.isArray(decoded)) return decoded.map((tag) => String(tag).trim()).filter(Boolean);
      } catch {
        return raw.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      }
    }
    return [];
  })();

  return {
    id: raw.id,
    slug: raw.slug || raw.id,
    title: raw.seo_title || raw.title,
    headline: raw.title,
    description: summary,
    content,
    category: raw.category_name || raw.category,
    image: heroImage,
    imageAlt: raw.image_alt || normalizedImages.find((img) => img?.isFeatured)?.altText || '',
    images: normalizedImages,
    publishedAt: raw.published_at || raw.publishedAt || raw.created_at || raw.updated_at,
    readTime: raw.read_time || estimateReadTime(content),
    seoTitle: raw.seo_title || raw.title,
    seoDescription: summary,
    keywords: raw.keywords || '',
    tags: parsedTags,
    views: raw.views || 0,
    isBreaking: raw.is_breaking || raw.isBreaking || false,
  };
}

export async function fetchArticles({ category, query } = {}, options = {}) {
  const bases = resolveApiBases();
  const errors = [];

  for (const base of bases) {
    const url = new URL(buildApiUrl(base, '/api/articles/published'));
    if (category) url.searchParams.set('category', category);
    if (query) url.searchParams.set('q', query);

    try {
      const data = await fetchJSON(url.toString(), {
        next: { revalidate: options.revalidate ?? 300 },
      });

      const mapped = Array.isArray(data) ? data.map(mapArticle) : [];
      if (mapped.length > 0 || base === bases[bases.length - 1]) {
        return mapped;
      }
    } catch (err) {
      errors.push(`${base}: ${err.message}`);
    }
  }

  if (errors.length) {
    console.error('Failed to fetch articles:', errors.join(' | '));
  }

  return [];
}

export async function fetchArticleBySlug(slug, { cache } = {}) {
  const bases = resolveApiBases();

  // Try direct endpoint across known hosts
  for (const base of bases) {
    try {
      const res = await fetch(`${buildApiUrl(base, '/api/articles')}/${slug}`, { cache: cache || 'no-store' });
      if (res.ok) {
        const data = await res.json();
        return mapArticle(data);
      }
    } catch (err) {
      console.warn('Direct article fetch failed, trying next base:', err.message);
    }
  }

  // Fallback: fetch list and find
  const articles = await fetchArticles({}, { revalidate: 60 });
  return articles.find((a) => a.slug === slug || a.id === slug) || null;
}

export async function fetchArticlesByCategory(category) {
  return fetchArticles({ category }, { revalidate: 300 });
}

export async function fetchRelatedArticles(article) {
  if (!article?.category) return [];
  const articles = await fetchArticles({ category: article.category }, { revalidate: 300 });
  return articles.filter((a) => a.slug !== article.slug).slice(0, 4);
}

export async function fetchTrendingArticles(limit = 6) {
  const articles = await fetchArticles({}, { revalidate: 120 });
  return articles
    .sort((a, b) => (b.views || 0) - (a.views || 0) || new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, limit);
}

export async function fetchLatestArticles(limit = 5) {
  const articles = await fetchArticles({}, { revalidate: 60 });
  return articles
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, limit);
}
