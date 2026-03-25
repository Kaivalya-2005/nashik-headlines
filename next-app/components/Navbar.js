"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Menu, X, ChevronDown } from 'lucide-react';
import { LOCATION_CATEGORIES, TOPIC_CATEGORIES } from '@/lib/categories';
import ThemeToggle from '@/components/ThemeToggle';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [query, setQuery] = useState('');

  const isActive = (path) => pathname === path;

  const onSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const params = new URLSearchParams({ q: query.trim() });
    router.push(`/?${params.toString()}`);
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/60">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-11 w-11 rounded-xl overflow-hidden border border-border bg-white shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Image src="/logo.jpeg" alt="Nashik Headlines" fill sizes="44px" className="object-cover" priority />
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-bold text-lg leading-tight tracking-tight">Nashik Headlines</span>
              <span className="text-overline text-muted-foreground hidden sm:block leading-none">Live • Local • Fast</span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="p-2.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Search"
            >
              <Search size={18} className="text-muted-foreground" />
            </button>
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2.5 rounded-lg hover:bg-secondary transition-colors md:hidden"
              aria-label="Menu"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="px-4 pb-3 animate-fade-in-up">
            <form onSubmit={onSearch} className="relative max-w-xl mx-auto">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Nashik news..."
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition-shadow"
              />
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </form>
          </div>
        )}

        <nav className="hidden md:flex items-center gap-0.5 px-4 pb-2.5 overflow-x-auto scrollbar-hide">
          <Link
            href="/"
            className={`px-3.5 py-1.5 text-caption font-medium rounded-full transition-colors whitespace-nowrap ${
              isActive('/') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            All
          </Link>

          {LOCATION_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className={`px-3.5 py-1.5 text-caption font-medium rounded-full transition-colors whitespace-nowrap ${
                isActive(`/category/${cat.slug}`)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {cat.label}
            </Link>
          ))}

          <span className="text-muted-foreground/30 mx-1">|</span>

          {TOPIC_CATEGORIES.slice(0, 4).map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className={`px-3.5 py-1.5 text-caption font-medium rounded-full transition-colors whitespace-nowrap ${
                isActive(`/category/${cat.slug}`)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {cat.label}
            </Link>
          ))}

          <div className="relative">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className="flex items-center gap-1 px-3.5 py-1.5 text-caption font-medium rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors whitespace-nowrap"
            >
              More
              <ChevronDown size={12} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            </button>
            {moreOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-40 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in-up">
                {TOPIC_CATEGORIES.slice(4).map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    onClick={() => setMoreOpen(false)}
                    className={`block px-4 py-2.5 text-sm transition-colors ${
                      isActive(`/category/${cat.slug}`) ? 'bg-secondary font-medium' : 'hover:bg-secondary/60'
                    }`}
                  >
                    {cat.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {menuOpen && (
          <nav className="md:hidden px-4 pb-4 space-y-0.5 animate-fade-in-up max-h-[60vh] overflow-y-auto">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-2.5 text-sm rounded-lg transition-colors ${
                isActive('/') ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
              }`}
            >
              All News
            </Link>

            <p className="px-4 pt-3 pb-1 text-overline text-muted-foreground uppercase tracking-widest">Places</p>
            {LOCATION_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 text-sm rounded-lg transition-colors ${
                  isActive(`/category/${cat.slug}`) ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                }`}
              >
                {cat.label}
              </Link>
            ))}

            <p className="px-4 pt-3 pb-1 text-overline text-muted-foreground uppercase tracking-widest">Topics</p>
            {TOPIC_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 text-sm rounded-lg transition-colors ${
                  isActive(`/category/${cat.slug}`) ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
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
