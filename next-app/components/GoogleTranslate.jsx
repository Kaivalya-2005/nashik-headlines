"use client";

import { useEffect, useState, useRef } from "react";
import Script from "next/script";
import { ChevronDown } from "lucide-react";

/* ─── Language config ─────────────────────────────────────────────────────── */
// Page is in Marathi — first option restores original, rest translate TO that language
const LANGUAGES = [
  { code: "mr", label: "मराठी (मूळ)", short: "MR" },
  { code: "en", label: "English",     short: "EN" },
  { code: "hi", label: "हिंदी",       short: "HI" },
  { code: "ta", label: "தமிழ்",       short: "TA" },
  { code: "te", label: "తెలుగు",      short: "TE" },
  { code: "kn", label: "ಕನ್ನಡ",       short: "KN" },
  { code: "ml", label: "മലയാളം",     short: "ML" },
  { code: "gu", label: "ગુજરાતી",    short: "GU" },
  { code: "bn", label: "বাংলা",      short: "BN" },
];

/* Helper to clear all googtrans cookies across all domain variations */
const clearAllGoogtransCookies = () => {
  if (typeof window === "undefined") return;
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  const pastDate = "Thu, 01 Jan 1970 00:00:00 UTC";

  const paths = ["/", ""];
  const domains = ["", hostname, `.${hostname}`];

  // Include root domain and parent domain variations
  for (let i = 0; i < parts.length; i++) {
    const sub = parts.slice(i).join(".");
    if (sub) {
      domains.push(sub);
      domains.push(`.${sub}`);
    }
  }

  paths.forEach((p) => {
    domains.forEach((d) => {
      const dAttr = d ? `; domain=${d}` : "";
      const pAttr = p ? `; path=${p}` : "";
      document.cookie = `googtrans=; expires=${pastDate}${pAttr}${dAttr}`;
      document.cookie = `googtrans=; expires=${pastDate}${pAttr}`;
    });
  });
};

/* Helper to set new googtrans cookie */
const setGoogtransCookie = (targetCode) => {
  clearAllGoogtransCookies();
  if (targetCode === "mr") return;

  const value = `/mr/${targetCode}`;
  const hostname = window.location.hostname;
  const parts = hostname.split(".");

  // 1. Set on default path /
  document.cookie = `googtrans=${value}; path=/`;

  // 2. Set on domain level for apex domain and hostname
  if (parts.length >= 2) {
    const rootDomain = "." + parts.slice(-2).join(".");
    document.cookie = `googtrans=${value}; path=/; domain=${rootDomain}`;
  }
  document.cookie = `googtrans=${value}; path=/; domain=${hostname}`;
};

function GTIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="flex-shrink-0 notranslate"
      translate="no"
    >
      <rect width="24" height="24" rx="5" fill="#4285F4" />
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
      <path d="M11 12 L13 10" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default function GoogleTranslate() {
  const [mounted, setMounted]   = useState(false);
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState(LANGUAGES[0]);
  const dropdownRef             = useRef(null);

  useEffect(() => {
    // Read active language from cookie on mount
    const match = document.cookie.match(/googtrans=\/(?:[a-zA-Z]{2}|auto)\/([a-zA-Z]{2})/i);
    if (match && match[1]) {
      const code = match[1].toLowerCase();
      const initLang = LANGUAGES.find((l) => l.code === code);
      if (initLang) setSelected(initLang);
    }

    window.googleTranslateElementInit = () => {
      try {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "mr",
            includedLanguages: "en,hi,ta,te,kn,ml,gu,bn",
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          "google_translate_element"
        );
      } catch (_) {}
    };

    // Clean style injection targeting ONLY Google Translate frames (NO global .skiptranslate hiding!)
    const styleId = "gt-banner-suppress";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        #goog-te-banner-frame,
        .goog-te-banner-frame,
        .goog-te-balloon-frame,
        #goog-gt-tt,
        .goog-te-spinner-pos {
          display: none !important;
          visibility: hidden !important;
        }
        body {
          top: 0px !important;
          position: static !important;
        }
      `;
      document.head.appendChild(style);
    }

    const killBanner = () => {
      const banner =
        document.getElementById("goog-te-banner-frame") ||
        document.querySelector(".goog-te-banner-frame");
      if (banner) banner.remove();
      if (document.body.style.top && document.body.style.top !== "0px") {
        document.body.style.top = "0px";
      }
    };

    const poll = setInterval(killBanner, 150);
    const stopPoll = setTimeout(() => clearInterval(poll), 6000);
    const observer = new MutationObserver(killBanner);
    observer.observe(document.body, { childList: true, subtree: false });

    killBanner();
    setMounted(true);

    return () => {
      clearInterval(poll);
      clearTimeout(stopPoll);
      observer.disconnect();
    };
  }, []);

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

  const switchLanguage = (lang) => {
    setSelected(lang);
    setOpen(false);

    if (lang.code === "mr") {
      clearAllGoogtransCookies();
      window.location.reload();
      return;
    }

    setGoogtransCookie(lang.code);

    const select = document.querySelector("#google_translate_element select");
    if (select) {
      select.value = lang.code;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      select.dispatchEvent(new Event("input", { bubbles: true }));
      if (typeof select.onchange === "function") {
        try { select.onchange(); } catch (_) {}
      }
    }

    setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  if (!mounted) return null;

  return (
    <>
      <div id="google_translate_element" className="gt-hidden-widget notranslate" translate="no" />

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

          <span className="gt-label-full notranslate" translate="no">
            {selected.label}
          </span>

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

      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
    </>
  );
}
