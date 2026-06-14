import Link from 'next/link';
import { Home, SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="container mx-auto px-4 py-20 text-center min-h-[60vh] flex flex-col items-center justify-center">
      {/* Animated 404 illustration */}
      <div className="relative mb-8">
        <div className="text-[8rem] md:text-[10rem] font-headline font-bold leading-none text-gradient select-none" style={{ animation: 'float 3s ease-in-out infinite' }}>
          404
        </div>
        <div className="absolute inset-0 bg-accent/5 rounded-full blur-3xl -z-10" />
      </div>

      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mb-5">
        <SearchX size={24} className="text-muted-foreground" />
      </div>

      <h1 className="font-headline font-bold text-title-lg mb-3">पान सापडले नाही</h1>
      <p className="text-muted-foreground text-body-lg max-w-md mx-auto mb-8">
        तुम्ही शोधत असलेले पान अस्तित्वात नाही किंवा हलवण्यात आले आहे. मुख्यपानावर परत या.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 group"
      >
        <Home size={16} />
        मुख्यपानावर परत
      </Link>
    </main>
  );
}
