"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Menu, X, ChevronDown } from 'lucide-react';
import { LOCATION_CATEGORIES, TOPIC_CATEGORIES } from '@/lib/categories';
import ThemeToggle from '@/components/ThemeToggle';
import GoogleTranslate from '@/components/GoogleTranslate';

function LiveDate() {
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const update = () => {
      setDateStr(
        new Date().toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  if (!dateStr) return null;
  return <span className="text-overline text-muted-foreground hidden sm:block leading-none">{dateStr}</span>;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const moreMenuRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [query, setQuery] = useState('');

  const featuredTopics = TOPIC_CATEGORIES.slice(0, 4);
  const moreTopics = TOPIC_CATEGORIES.slice(4);

  const isActive = (path) => pathname === path;

  const onSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const params = new URLSearchParams({ q: query.trim() });
    router.push(`/?${params.toString()}`);
    setSearchOpen(false);
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!moreOpen) return;
      if (!moreMenuRef.current?.contains(event.target)) {
        setMoreOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreOpen]);

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-[1450px] mx-auto">
        <div className="flex items-center justify-between h-16 px-3 md:px-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative h-10 w-10 md:h-11 md:w-11 overflow-hidden border border-transparent md:border-border bg-transparent">
              <Image src="/logo.jpeg" alt="Nashik Headlines" fill sizes="44px" className="object-contain" priority />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight">Nashik Headlines</span>
              <LiveDate />
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="p-2 hover:bg-secondary transition-colors"
              aria-label="Search"
            >
              <Search size={18} className="text-muted-foreground" />
            </button>
            <ThemeToggle />
            <GoogleTranslate />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 hover:bg-secondary transition-colors md:hidden"
              aria-label="Menu"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="px-3 md:px-4 pb-3 animate-fade-in-up">
            <form onSubmit={onSearch} className="relative max-w-xl">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Nashik news..."
                autoFocus
                className="w-full h-10 pl-10 pr-3 bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </form>
          </div>
        )}

        <nav className="hidden md:flex items-center justify-between gap-4 px-3 md:px-4 border-t border-border/50">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <NavLink href="/" active={isActive('/')} label="Home" />
            {LOCATION_CATEGORIES.map((cat) => (
              <NavLink
                key={cat.slug}
                href={`/category/${cat.slug}`}
                active={isActive(`/category/${cat.slug}`)}
                label={cat.label}
              />
            ))}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {featuredTopics.map((cat) => (
              <NavLink
                key={cat.slug}
                href={`/category/${cat.slug}`}
                active={isActive(`/category/${cat.slug}`)}
                label={cat.label}
              />
            ))}
            <WordleQuickLink active={isActive('/wordle')} />

            {moreTopics.length > 0 ? (
              <div ref={moreMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 flex items-center gap-1 ${
                    moreOpen ? 'text-foreground bg-secondary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                >
                  More
                  <ChevronDown size={14} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
                </button>
                {moreOpen ? (
                  <div className="absolute right-0 top-full mt-1 min-w-[180px] border border-border bg-card shadow-sm z-50">
                    {moreTopics.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/category/${cat.slug}`}
                        className={`block px-3 py-2 text-sm transition-colors ${
                          isActive(`/category/${cat.slug}`)
                            ? 'bg-secondary text-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                        }`}
                      >
                        {cat.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="md:hidden border-t border-border animate-fade-in-up max-h-[70vh] overflow-y-auto">
            <div className="px-4 py-3 space-y-0">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2.5 text-sm ${
                  isActive('/') ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-secondary'
                }`}
              >
                All News
              </Link>
              <Link
                href="/wordle"
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2.5 text-sm border border-transparent ${
                  isActive('/wordle')
                    ? 'bg-secondary text-foreground font-semibold border-accent/40'
                    : 'hover:bg-secondary text-foreground border-border/60'
                }`}
              >
                🎮 Play Wordle
              </Link>

              <p className="px-3 pt-3 pb-1 text-xs text-muted-foreground font-semibold">PLACES</p>
              {LOCATION_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2.5 text-sm ${
                    isActive(`/category/${cat.slug}`) ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-secondary'
                  }`}
                >
                  {cat.label}
                </Link>
              ))}

              <div className="my-1 border-t border-border/50" />

              <p className="px-3 pt-2 pb-1 text-xs text-muted-foreground font-semibold">TOPICS</p>
              {TOPIC_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2.5 text-sm ${
                    isActive(`/category/${cat.slug}`) ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-secondary'
                  }`}
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, active, label }) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
        active
          ? 'bg-secondary text-foreground border-b-2 border-accent'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  );
}

function WordleQuickLink({ active }) {
  return (
    <Link
      href="/wordle"
      className={`px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-200 border-b-2 flex items-center gap-1 ${
        active
          ? 'border-accent text-foreground bg-secondary'
          : 'border-transparent text-foreground hover:bg-secondary'
      }`}
      aria-label="Open Wordle"
      title="Play Wordle"
    >
      <span aria-hidden>🎮</span>
      <span>Wordle</span>
      <span className="text-[10px] text-accent uppercase tracking-wide">Play</span>
    </Link>
  );
}
