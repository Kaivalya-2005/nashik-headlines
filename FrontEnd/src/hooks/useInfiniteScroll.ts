/**
 * useInfiniteScroll — loads more items as the user scrolls to the bottom.
 * Uses IntersectionObserver for efficient scroll detection.
 */

import { useEffect, useRef, useCallback, useState } from "react";

interface UseInfiniteScrollOptions<T> {
  /** All available items */
  items: T[];
  /** How many items to show per page */
  pageSize?: number;
}

export function useInfiniteScroll<T>({ items, pageSize = 6 }: UseInfiniteScrollOptions<T>) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + pageSize, items.length));
  }, [pageSize, items.length]);

  /* Reset when items change (e.g. category switch) */
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items, pageSize]);

  /* IntersectionObserver to auto-load when sentinel enters viewport */
  useEffect(() => {
    const node = loaderRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return { visibleItems, hasMore, loaderRef };
}
