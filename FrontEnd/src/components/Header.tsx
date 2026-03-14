/**
 * Header — premium sticky navbar with grouped category navigation.
 * Separates location and topic categories for clear UX.
 */

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, Moon, Sun, Bookmark, Menu, X, ChevronDown } from "lucide-react";
import { LOCATION_CATEGORIES, TOPIC_CATEGORIES } from "@/types/news";
import { useTheme } from "@/hooks/useTheme";

export default function Header() {
  const { isDark, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/60">
      <div className="container mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16 px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105">
              <span className="text-accent-foreground font-headline font-bold text-sm tracking-tight">
                NH
              </span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline font-bold text-lg leading-tight tracking-tight">
                Nashik Headlines
              </h1>
              <span className="text-overline text-muted-foreground hidden sm:block leading-none">
                Your Regional News Source
              </span>
            </div>
          </Link>

          {/* Desktop actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Search"
            >
              <Search size={18} className="text-muted-foreground" />
            </button>
            <Link
              to="/bookmarks"
              className="p-2.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Bookmarks"
            >
              <Bookmark size={18} className="text-muted-foreground" />
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} className="text-muted-foreground" /> : <Moon size={18} className="text-muted-foreground" />}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2.5 rounded-lg hover:bg-secondary transition-colors md:hidden"
              aria-label="Menu"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="px-4 pb-3 animate-fade-in-up">
            <form onSubmit={handleSearch} className="relative max-w-xl mx-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Nashik news..."
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition-shadow"
                autoFocus
              />
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </form>
          </div>
        )}

        {/* Category navigation — desktop */}
        <nav className="hidden md:flex items-center gap-0.5 px-4 pb-2.5 overflow-x-auto scrollbar-hide">
          <Link
            to="/"
            className={`px-3.5 py-1.5 text-caption font-medium rounded-full transition-colors whitespace-nowrap ${
              isActive("/") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            All
          </Link>

          {/* Location categories */}
          {LOCATION_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              to={`/category/${cat.slug}`}
              className={`px-3.5 py-1.5 text-caption font-medium rounded-full transition-colors whitespace-nowrap ${
                isActive(`/category/${cat.slug}`) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {cat.label}
            </Link>
          ))}

          {/* Separator dot */}
          <span className="text-muted-foreground/30 mx-1">|</span>

          {/* Topic categories */}
          {TOPIC_CATEGORIES.slice(0, 4).map((cat) => (
            <Link
              key={cat.slug}
              to={`/category/${cat.slug}`}
              className={`px-3.5 py-1.5 text-caption font-medium rounded-full transition-colors whitespace-nowrap ${
                isActive(`/category/${cat.slug}`) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {cat.label}
            </Link>
          ))}

          {/* More dropdown for remaining topics */}
          <div className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="flex items-center gap-1 px-3.5 py-1.5 text-caption font-medium rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors whitespace-nowrap"
            >
              More
              <ChevronDown size={12} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} />
            </button>
            {moreOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-40 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in-up">
                {TOPIC_CATEGORIES.slice(4).map((cat) => (
                  <Link
                    key={cat.slug}
                    to={`/category/${cat.slug}`}
                    onClick={() => setMoreOpen(false)}
                    className={`block px-4 py-2.5 text-sm transition-colors ${
                      isActive(`/category/${cat.slug}`) ? "bg-secondary font-medium" : "hover:bg-secondary/60"
                    }`}
                  >
                    {cat.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="md:hidden px-4 pb-4 space-y-0.5 animate-fade-in-up max-h-[60vh] overflow-y-auto">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-2.5 text-sm rounded-lg transition-colors ${
                isActive("/") ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
              }`}
            >
              All News
            </Link>

            <p className="px-4 pt-3 pb-1 text-overline text-muted-foreground uppercase tracking-widest">Places</p>
            {LOCATION_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 text-sm rounded-lg transition-colors ${
                  isActive(`/category/${cat.slug}`) ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                }`}
              >
                {cat.label}
              </Link>
            ))}

            <p className="px-4 pt-3 pb-1 text-overline text-muted-foreground uppercase tracking-widest">Topics</p>
            {TOPIC_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 text-sm rounded-lg transition-colors ${
                  isActive(`/category/${cat.slug}`) ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
