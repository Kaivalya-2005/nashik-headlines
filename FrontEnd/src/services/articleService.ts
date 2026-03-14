/**
 * Article service — fetches news from the database.
 * Replaces all external API calls with direct DB queries.
 */

import { supabase } from "@/integrations/supabase/client";
import { Article, Category } from "@/types/news";

interface DBArticle {
  id: string;
  slug: string | null;
  title: string;
  summary: string;
  content: string;
  image_url: string | null;
  category: string;
  location: string | null;
  author: string;
  published_at: string;
  is_breaking: boolean;
  is_published: boolean;
  views: number;
  read_time: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** Map DB row to frontend Article type */
function mapArticle(row: DBArticle): Article {
  return {
    id: row.id,
    slug: row.slug || undefined,
    headline: row.title,
    summary: row.summary,
    content: row.content,
    imageUrl: row.image_url || "https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=800&h=500&fit=crop",
    source: row.author,
    category: row.category as Category,
    publishedAt: row.published_at,
    readTime: row.read_time,
    views: row.views,
    isBreaking: row.is_breaking,
    sourceUrl: undefined,
  };
}

/** Fetch a single article by slug */
export async function fetchArticleBySlug(slug: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !data) return null;
  return mapArticle(data as DBArticle);
}

/** Fetch published articles, optionally filtered by category */
export async function fetchArticles(category?: Category, query?: string): Promise<Article[]> {
  let q = supabase
    .from("articles")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (category) {
    q = q.eq("category", category);
  }

  if (query) {
    q = q.or(`title.ilike.%${query}%,summary.ilike.%${query}%`);
  }

  const { data, error } = await q;
  if (error) {
    console.error("Error fetching articles:", error.message);
    return [];
  }
  return (data as DBArticle[]).map(mapArticle);
}

/** Fetch a single article by ID (published) */
export async function fetchArticleById(id: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (error || !data) return null;
  return mapArticle(data as DBArticle);
}

/** Fetch trending articles (by views) */
export async function fetchTrendingArticles(limit = 5): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("is_published", true)
    .order("views", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data as DBArticle[]).map(mapArticle);
}

/** Fetch breaking news */
export async function fetchBreakingNews(): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("is_published", true)
    .eq("is_breaking", true)
    .order("published_at", { ascending: false })
    .limit(10);

  if (error) return [];
  return (data as DBArticle[]).map(mapArticle);
}

/** Fetch related articles (same category, excluding current) */
export async function fetchRelatedArticles(articleId: string, category: string, limit = 4): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("is_published", true)
    .eq("category", category)
    .neq("id", articleId)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data as DBArticle[]).map(mapArticle);
}

/** Fetch category article counts for heatmap */
export async function fetchCategoryHeatmap(): Promise<{ slug: string; label: string; count: number }[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("category")
    .eq("is_published", true);

  if (error || !data) return [];

  const counts: Record<string, number> = {};
  data.forEach((row: { category: string }) => {
    counts[row.category] = (counts[row.category] || 0) + 1;
  });

  return Object.entries(counts).map(([slug, count]) => ({
    slug,
    label: slug.charAt(0).toUpperCase() + slug.slice(1),
    count,
  }));
}

/** Increment view count (fire and forget) */
export function incrementViews(articleId: string) {
  supabase.rpc("increment_views", { article_id: articleId }).then(({ error }) => {
    if (error) console.warn("Failed to increment views:", error.message);
  });
}
