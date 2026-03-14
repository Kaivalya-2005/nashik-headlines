/**
 * useNewsQuery — React Query wrapper for database article queries.
 * Provides caching (5 min stale time), background refetching, and error handling.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchArticles, fetchTrendingArticles, fetchBreakingNews, fetchCategoryHeatmap } from "@/services/articleService";
import { Category, Article } from "@/types/news";

const STALE_TIME = 5 * 60 * 1000;
const CACHE_TIME = 10 * 60 * 1000;

/** Fetch and cache articles by category / search query */
export function useNewsQuery(category?: Category, query?: string) {
  return useQuery<Article[]>({
    queryKey: ["articles", category || "all", query || ""],
    queryFn: () => fetchArticles(category, query),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/** Fetch and cache trending articles */
export function useTrendingQuery(limit = 5) {
  return useQuery<Article[]>({
    queryKey: ["trending", limit],
    queryFn: () => fetchTrendingArticles(limit),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
  });
}

/** Fetch and cache breaking news */
export function useBreakingQuery() {
  return useQuery<Article[]>({
    queryKey: ["breaking"],
    queryFn: fetchBreakingNews,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
  });
}

/** Fetch and cache category heatmap */
export function useCategoryHeatmapQuery() {
  return useQuery({
    queryKey: ["category-heatmap"],
    queryFn: fetchCategoryHeatmap,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
  });
}
