import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container mx-auto px-4 py-20 text-center">
      <h1 className="font-headline text-display mb-4">Page Not Found</h1>
      <p className="text-muted-foreground mb-6">The page you are looking for does not exist.</p>
      <Link href="/" className="text-accent hover:underline text-body-lg">← Back to homepage</Link>
    </main>
  );
}
