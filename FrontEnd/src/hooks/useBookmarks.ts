/**
 * useBookmarks — manages bookmarked article IDs in localStorage.
 * Simple and lightweight, no external dependencies.
 */

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "nashik-headlines-bookmarks";

function loadBookmarks(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>(loadBookmarks);

  // Sync to localStorage whenever bookmarks change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  const toggleBookmark = useCallback((articleId: string) => {
    setBookmarks((prev) =>
      prev.includes(articleId)
        ? prev.filter((id) => id !== articleId)
        : [...prev, articleId]
    );
  }, []);

  const isBookmarked = useCallback(
    (articleId: string) => bookmarks.includes(articleId),
    [bookmarks]
  );

  return { bookmarks, toggleBookmark, isBookmarked };
}
