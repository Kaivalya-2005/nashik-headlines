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
  verification: {
    // Add your Google Search Console verification code here
    // google: 'YOUR_VERIFICATION_CODE',
  },
};

export const viewport = {
  themeColor: '#0f2b6b',
};

export default function RootLayout({ children }) {
  return (
    <html lang="mr">
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

