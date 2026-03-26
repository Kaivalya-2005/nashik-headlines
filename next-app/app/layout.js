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
    default: 'Nashik Headlines — Latest News from Nashik & Maharashtra',
    template: '%s | Nashik Headlines',
  },
  description: 'Get the latest breaking news, local stories, and in-depth coverage from Nashik, Maharashtra, India. Trusted source for Nashik headlines.',
  openGraph: {
    title: 'Nashik Headlines',
    description: 'Stay updated with the latest Nashik and Maharashtra news.',
    url: siteUrl,
    siteName: 'Nashik Headlines',
    locale: 'en_IN',
    type: 'website',
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
    icon: '/logo.jpeg',
    shortcut: '/logo.jpeg',
    apple: '/logo.jpeg',
  },
  themeColor: '#0f2b6b',
  verification: {
    // Add your Google Search Console verification code here
    // google: 'YOUR_VERIFICATION_CODE',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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

