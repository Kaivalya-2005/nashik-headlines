import { estimateReadTime } from '@/lib/format';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000/api';
const PUBLISHED_URL = `${API_BASE}/articles/published`;
const ARTICLES_URL = `${API_BASE}/articles`;

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
  const summary = raw.seo_description || raw.description || content.slice(0, 180);

  return {
    id: raw.id,
    slug: raw.slug || raw.id,
    title: raw.seo_title || raw.title,
    headline: raw.title,
    description: summary,
    content,
    category: raw.category_name || raw.category,
    image: raw.image_url || raw.imageUrl,
    publishedAt: raw.published_at || raw.publishedAt,
    readTime: raw.read_time || estimateReadTime(content),
    seoTitle: raw.seo_title || raw.title,
    seoDescription: summary,
    keywords: raw.keywords || '',
    views: raw.views || 0,
    isBreaking: raw.is_breaking || raw.isBreaking || false,
  };
}

export async function fetchArticles({ category, query } = {}, options = {}) {
  const url = new URL(PUBLISHED_URL);
  if (category) url.searchParams.set('category', category);
  if (query) url.searchParams.set('q', query);

  try {
    const data = await fetchJSON(url.toString(), {
      next: { revalidate: options.revalidate ?? 300 },
    });
    return Array.isArray(data) ? data.map(mapArticle) : [];
  } catch (err) {
    console.error('Failed to fetch articles:', err.message);
    return [];
  }
}

export async function fetchArticleBySlug(slug, { cache } = {}) {
  // Try direct endpoint
  try {
    const res = await fetch(`${ARTICLES_URL}/${slug}`, { cache: cache || 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return mapArticle(data);
    }
  } catch (err) {
    console.warn('Direct article fetch failed, falling back:', err.message);
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
