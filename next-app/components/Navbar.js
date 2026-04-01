"use client";

import { useState, useEffect } from 'react';
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

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
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/60">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-11 w-11 rounded-xl overflow-hidden border border-border bg-white shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md">
              <Image src="/logo.jpeg" alt="Nashik Headlines" fill sizes="44px" className="object-cover" priority />
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-bold text-lg leading-tight tracking-tight">Nashik Headlines</span>
              <LiveDate />
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
            <GoogleTranslate />
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
                autoFocus
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition-shadow"
              />
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </form>
          </div>
        )}

        <nav className="hidden md:flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 pb-3">
          <div className="flex flex-wrap items-center gap-1 md:gap-1.5">
            <NavPill href="/" active={isActive('/')} label="Home" />
            
            <NavPill href="/category/nashik" active={isActive('/category/nashik')} label="Nashik" />
            <DesktopNavDropdown 
              label="Cities" 
              items={LOCATION_CATEGORIES.filter(c => !['nashik', 'maharashtra', 'india', 'international'].includes(c.slug))} 
              isActive={isActive} 
            />
            <NavPill href="/category/maharashtra" active={isActive('/category/maharashtra')} label="Maharashtra" />
            <NavPill href="/category/india" active={isActive('/category/india')} label="India" />
            <NavPill href="/category/international" active={isActive('/category/international')} label="World" />
          </div>

          <div className="flex flex-wrap items-center gap-1 md:gap-1.5">
            {TOPIC_CATEGORIES.slice(0, 4).map((cat) => (
              <NavPill key={cat.slug} href={`/category/${cat.slug}`} active={isActive(`/category/${cat.slug}`)} label={cat.label} />
            ))}
            <DesktopNavDropdown 
              label="More" 
              items={TOPIC_CATEGORIES.slice(4)} 
              isActive={isActive} 
              align="right"
            />
          </div>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="md:hidden border-t border-border/50 animate-fade-in-up max-h-[70vh] overflow-y-auto">
            <div className="px-4 py-3 space-y-0.5">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 text-sm rounded-lg transition-all duration-150 ${
                  isActive('/') ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-secondary hover:pl-5'
                }`}
              >
                All News
              </Link>

              <p className="px-4 pt-4 pb-1.5 text-overline text-muted-foreground font-semibold tracking-widest">Places</p>
              {LOCATION_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-2.5 text-sm rounded-lg transition-all duration-150 ${
                    isActive(`/category/${cat.slug}`) ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-secondary hover:pl-5'
                  }`}
                >
                  {cat.label}
                </Link>
              ))}

              <div className="my-2 border-t border-border/50" />

              <p className="px-4 pt-2 pb-1.5 text-overline text-muted-foreground font-semibold tracking-widest">Topics</p>
              {TOPIC_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-2.5 text-sm rounded-lg transition-all duration-150 ${
                    isActive(`/category/${cat.slug}`) ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-secondary hover:pl-5'
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

function NavPill({ href, active, label }) {
  return (
    <Link
      href={href}
      className={`relative px-3.5 py-1.5 text-caption font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      }`}
    >
      {label}
      {active && (
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-accent" />
      )}
    </Link>
  );
}

function DesktopNavDropdown({ label, items, isActive, align = 'left' }) {
  return (
    <div className="relative group cursor-pointer z-50">
      <div className="flex items-center gap-1 px-3.5 py-1.5 text-caption font-medium rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 whitespace-nowrap group-hover:bg-secondary group-hover:text-foreground">
        {label}
        <ChevronDown size={12} className="transition-transform duration-200 group-hover:rotate-180" />
      </div>
      
      {/* Invisible bridge to maintain hover state */}
      <div className="absolute top-full left-0 w-full h-3"></div>
      
      <div className={`absolute top-[calc(100%+0.5rem)] ${align === 'right' ? 'right-0' : 'left-0'} w-48 bg-card border border-border rounded-xl shadow-elevated opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 transition-all duration-200 overflow-hidden`}>
        {items.map((cat) => (
          <Link
            key={cat.slug}
            href={`/category/${cat.slug}`}
            className={`block px-4 py-2.5 text-sm transition-all duration-150 ${
              isActive(`/category/${cat.slug}`)
                ? 'bg-secondary/80 font-medium text-foreground border-l-2 border-primary'
                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:pl-5 border-l-2 border-transparent hover:border-border'
            }`}
          >
            {cat.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
