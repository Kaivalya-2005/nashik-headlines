/**
 * SEOHead — dynamic meta tag manager for per-page SEO.
 * Updates document title and meta tags based on current page context.
 */

import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  canonicalPath?: string;
  /** JSON-LD structured data object */
  jsonLd?: Record<string, any>;
}

const BASE_TITLE = "Nashik Headlines";
const BASE_URL = "https://nashikheadlines.com";

export default function SEOHead({
  title,
  description,
  ogImage,
  ogType = "website",
  canonicalPath,
  jsonLd,
}: SEOHeadProps) {
  useEffect(() => {
    /* Page title */
    const fullTitle = title ? `${title} — ${BASE_TITLE}` : BASE_TITLE;
    document.title = fullTitle;

    /* Helper to set or create a meta tag */
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
      setMeta("name", "twitter:description", description);
    }

    setMeta("property", "og:title", fullTitle);
    setMeta("name", "twitter:title", fullTitle);
    setMeta("property", "og:type", ogType);

    if (ogImage) {
      setMeta("property", "og:image", ogImage);
      setMeta("name", "twitter:image", ogImage);
    }

    /* Canonical URL */
    if (canonicalPath) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", `${BASE_URL}${canonicalPath}`);
      setMeta("property", "og:url", `${BASE_URL}${canonicalPath}`);
    }

    /* JSON-LD */
    const jsonLdId = "dynamic-jsonld";
    let scriptEl = document.getElementById(jsonLdId) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.id = jsonLdId;
        scriptEl.type = "application/ld+json";
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    /* Cleanup: restore base title on unmount */
    return () => {
      document.title = `${BASE_TITLE} — Latest News from Nashik & Maharashtra`;
    };
  }, [title, description, ogImage, ogType, canonicalPath, jsonLd]);

  return null; // No DOM output — side effects only
}
