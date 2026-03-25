import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-border mt-16 py-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-headline font-bold text-[10px]">NH</span>
            </div>
            <span className="font-headline font-semibold text-sm">Nashik Headlines</span>
          </div>

          <nav className="flex items-center gap-6 text-caption text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/category/nashik" className="hover:text-foreground transition-colors">Nashik</Link>
          </nav>

          <p className="text-overline text-muted-foreground">© {new Date().getFullYear()} Nashik Headlines</p>
        </div>
      </div>
    </footer>
  );
}
