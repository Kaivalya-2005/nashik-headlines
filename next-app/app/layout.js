import './globals.css';
import Script from 'next/script';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { ThemeProvider } from '@/components/ThemeProvider';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXXXXXX';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'नाशिक हेडलाईन्स — नाशिक व महाराष्ट्रातील ताज्या बातम्या',
    template: '%s | नाशिक हेडलाईन्स',
  },
  description: 'नाशिक, महाराष्ट्र आणि भारतातील ताज्या बातम्या, स्थानिक घडामोडी आणि सखोल वृत्तांकन. नाशिक हेडलाईन्स — आपला विश्वासू बातम्यांचा स्रोत.',
  openGraph: {
    title: 'नाशिक हेडलाईन्स',
    description: 'नाशिक आणि महाराष्ट्रातील ताज्या बातम्यांसाठी नाशिक हेडलाईन्सशी जोडलेले राहा.',
    url: siteUrl,
    siteName: 'नाशिक हेडलाईन्स',
    locale: 'mr_IN',
    type: 'website',
    images: [
      {
        url: `${siteUrl}/icon-512.png`,
        width: 512,
        height: 512,
        alt: 'नाशिक हेडलाईन्स',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  verification: {
    // Add your Google Search Console verification code here
    // google: 'YOUR_VERIFICATION_CODE',
  },
};

export const viewport = {
  themeColor: '#0f2b6b',
};

const globalOrgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'NewsMediaOrganization',
  name: 'नाशिक हेडलाईन्स',
  alternateName: ['Nashik Headlines', 'NashikHeadlines'],
  url: siteUrl,
  logo: {
    '@type': 'ImageObject',
    url: `${siteUrl}/icon-512.png`,
    width: 512,
    height: 512,
  },
  image: `${siteUrl}/icon-512.png`,
  description: 'नाशिक, महाराष्ट्र आणि भारतातील ताज्या बातम्या, स्थानिक घडामोडी आणि सखोल वृत्तांकन.',
};

const globalWebSiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'नाशिक हेडलाईन्स',
  alternateName: 'Nashik Headlines',
  url: siteUrl,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${siteUrl}/?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="mr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('nh-theme');
                  var isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon-48.png" type="image/png" sizes="48x48" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(globalOrgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(globalWebSiteJsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
          <BackToTop />
        </ThemeProvider>

        {/* Google Analytics 4 */}
        {GA_ID !== 'G-XXXXXXXXXX' && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
