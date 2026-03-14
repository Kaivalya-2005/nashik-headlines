/**
 * useTheme — manages dark/light theme with localStorage persistence.
 * Applies 'dark' class to document element.
 */

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "nashik-headlines-theme";

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark((prev) => !prev), []);

  return { isDark, toggleTheme };
}
