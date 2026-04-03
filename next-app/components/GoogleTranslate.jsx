"use client";

import { useEffect, useState, useRef } from "react";
import Script from "next/script";
import { ChevronDown } from "lucide-react";

/* ─── Language config ─────────────────────────────────────────────────────── */
const LANGUAGES = [
  { code: "en", label: "English",    short: "EN" },
  { code: "hi", label: "हिंदी",      short: "HI" },
  { code: "mr", label: "मराठी",      short: "MR" },
  { code: "ta", label: "தமிழ்",      short: "TA" },
  { code: "te", label: "తెలుగు",     short: "TE" },
  { code: "kn", label: "ಕನ್ನಡ",      short: "KN" },
  { code: "ml", label: "മലയാളം",    short: "ML" },
  { code: "gu", label: "ગુજરાતી",   short: "GU" },
  { code: "bn", label: "বাংলা",     short: "BN" },
];

/* ─── Official Google Translate SVG icon ──────────────────────────────────── */
function GTIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      {/* Blue background pill */}
      <rect width="24" height="24" rx="5" fill="#4285F4" />
      {/* White "translate" glyph — simplified Google Translate logo shape */}
      <text
        x="5"
        y="15"
        fontFamily="'Product Sans', Arial, sans-serif"
        fontSize="11"
        fontWeight="700"
        fill="white"
        letterSpacing="-0.5"
      >
        A
      </text>
      <text
        x="12"
        y="18"
        fontFamily="'Noto Sans', Arial, sans-serif"
        fontSize="8"
        fontWeight="700"
        fill="white"
      >
        あ
      </text>
      {/* small arrow between the two glyphs */}
      <path d="M11 12 L13 10" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function GoogleTranslate() {
  const [mounted, setMounted]       = useState(false);
  const [open, setOpen]             = useState(false);
  const [selected, setSelected]     = useState(LANGUAGES[0]);
  const [gtReady, setGtReady]       = useState(false);
  const dropdownRef                 = useRef(null);

  /* Runs only on the client — prevents SSR hydration mismatch */
  useEffect(() => {
    /* Set initial language from cookie if available */
    const match = document.cookie.match(/googtrans=\/?en\/([a-z]{2})/);
    if (match && match[1]) {
      const initLang = LANGUAGES.find((l) => l.code === match[1]);
      if (initLang) setSelected(initLang);
    }

    /* Expose callback BEFORE the script loads */
    window.googleTranslateElementInit = () => {
      try {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,hi,mr,ta,te,kn,ml,gu,bn",
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          "google_translate_element"
        );
        setGtReady(true);
      } catch (_) {}
    };

    /* ── Nuclear banner suppression ────────────────────────────────────────
       Google injects the banner AFTER hydration and applies body.style.top
       as a non-important inline style. Strategy:
       1. Inject a <style> tag — stylesheet !important beats inline (no !important)
       2. setInterval every 100 ms for 8 s — removes the iframe from the DOM
          entirely before Google can paint it
       3. MutationObserver — catches any re-injection afterwards              */

    // 1. Inject sticky CSS into <head>
    const style = document.createElement("style");
    style.id = "gt-suppress";
    style.textContent = `
      #goog-te-banner-frame,
      .goog-te-banner-frame,
      .skiptranslate { display: none !important; }
      body { top: 0 !important; }
    `;
    document.head.appendChild(style);

    // 2. Aggressive polling for the first 8 s (covers slow connections)
    const killBanner = () => {
      const banner =
        document.getElementById("goog-te-banner-frame") ||
        document.querySelector(".goog-te-banner-frame");
      if (banner) banner.remove();
      if (document.body.style.top && document.body.style.top !== "0px") {
        document.body.style.top = "0px";
      }
    };

    const poll = setInterval(killBanner, 100);
    const stopPoll = setTimeout(() => clearInterval(poll), 8000);

    // 3. MutationObserver for after polling stops
    const observer = new MutationObserver(killBanner);
    observer.observe(document.body, { childList: true, subtree: false });

    killBanner();
    setMounted(true);

    return () => {
      clearInterval(poll);
      clearTimeout(stopPoll);
      observer.disconnect();
      document.getElementById("gt-suppress")?.remove();
    };
  }, []);

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* Programmatically drive Google Translate's hidden <select> */
  const switchLanguage = (lang) => {
    setSelected(lang);
    setOpen(false);

    // For English, clear googtrans cookie and reload to restore original
    if (lang.code === "en") {
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname}; path=/`;
      window.location.reload();
      return;
    }

    // Try to use the hidden GT select element (no page reload needed)
    const trySelect = (attemptsLeft) => {
      const select = document.querySelector("#google_translate_element select");
      if (select) {
        select.value = lang.code;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
      if (attemptsLeft > 0) {
        // GT widget not ready yet — retry after a short wait
        setTimeout(() => trySelect(attemptsLeft - 1), 200);
      } else {
        // Fallback: set googtrans cookie and reload
        const val = `/en/${lang.code}`;
        document.cookie = `googtrans=${val}; path=/`;
        document.cookie = `googtrans=${val}; domain=${window.location.hostname}; path=/`;
        window.location.reload();
      }
    };

    trySelect(10); // up to ~2 s of retries
  };

  /* Nothing rendered on the server */
  if (!mounted) return null;

  return (
    <>
      {/* Hidden Google Translate widget — only needed for initialization */}
      <div id="google_translate_element" className="gt-hidden-widget" />

      {/* ── Custom UI ─────────────────────────────────────────────────── */}
      <div ref={dropdownRef} className="gt-root notranslate" translate="no">
        <button
          onClick={() => setOpen((v) => !v)}
          className="gt-trigger notranslate"
          translate="no"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Select language"
          title="Translate"
        >
          <GTIcon size={18} />

          {/* Desktop: full label */}
          <span className="gt-label-full notranslate" translate="no">
            {selected.label}
          </span>

          {/* Tablet: short code */}
          <span className="gt-label-short notranslate" translate="no">
            {selected.short}
          </span>

          <ChevronDown
            size={12}
            className={`gt-chevron ${open ? "gt-chevron-open" : ""}`}
            aria-hidden="true"
          />
        </button>

        {open && (
          <ul className="gt-dropdown notranslate" translate="no" role="listbox" aria-label="Languages">
            {LANGUAGES.map((lang) => (
              <li
                key={lang.code}
                role="option"
                aria-selected={selected.code === lang.code}
                className={`gt-option notranslate ${selected.code === lang.code ? "gt-option-active" : ""}`}
                translate="no"
                onClick={() => switchLanguage(lang)}
              >
                <span className="gt-option-short notranslate" translate="no">{lang.short}</span>
                <span className="gt-option-label notranslate" translate="no">{lang.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>


      {/* Lazy-load Google Translate script */}
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
    </>
  );
}
