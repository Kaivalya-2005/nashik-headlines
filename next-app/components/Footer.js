import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="border-t border-border mt-16 py-10 bg-gradient-to-r from-primary/5 via-primary/8 to-primary/5">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-border bg-white shadow-sm">
              <Image src="/logo.jpeg" alt="Nashik Headlines" fill sizes="40px" className="object-cover" />
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
