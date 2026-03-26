import Link from 'next/link';
import Image from 'next/image';
import { LOCATION_CATEGORIES, TOPIC_CATEGORIES } from '@/lib/categories';

export default function Footer() {
  return (
    <footer className="border-t border-border mt-16 bg-gradient-to-b from-background via-background to-primary/5">
      {/* Gradient accent line */}
      <div className="h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-30" />

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-border bg-white shadow-sm">
                <Image src="/logo.jpeg" alt="Nashik Headlines" fill sizes="40px" className="object-cover" />
              </div>
              <span className="font-headline font-bold text-lg">Nashik Headlines</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Your trusted source for the latest news from Nashik, Maharashtra, and beyond. Stay informed with breaking news, local stories, and in-depth coverage.
            </p>
          </div>

          {/* Locations column */}
          <div>
            <h3 className="font-headline font-semibold text-sm mb-4 section-accent pb-2">Locations</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {LOCATION_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Topics column */}
          <div>
            <h3 className="font-headline font-semibold text-sm mb-4 section-accent pb-2">Topics</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {TOPIC_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Connect column */}
          <div>
            <h3 className="font-headline font-semibold text-sm mb-4 section-accent pb-2">Connect</h3>
            <div className="space-y-2.5">
              <Link href="/" className="block text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
                Home
              </Link>
              <Link href="/category/nashik" className="block text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
                Latest from Nashik
              </Link>
              <p className="text-sm text-muted-foreground pt-2">
                Got a story tip?<br />
                <span className="text-foreground/70 font-medium">tips@nashikheadlines.com</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-overline text-muted-foreground">
            © {new Date().getFullYear()} Nashik Headlines. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-overline text-muted-foreground">
            <span>Live • Local • Fast</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
