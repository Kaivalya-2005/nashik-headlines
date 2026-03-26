"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-lg hover:bg-secondary transition-all duration-300 group"
      aria-label="Toggle theme"
    >
      <div className="relative w-[18px] h-[18px]">
        <Sun
          size={18}
          className={`absolute inset-0 text-amber-500 transition-all duration-300 ${
            isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
          }`}
        />
        <Moon
          size={18}
          className={`absolute inset-0 text-muted-foreground transition-all duration-300 ${
            isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          }`}
        />
      </div>
    </button>
  );
}
