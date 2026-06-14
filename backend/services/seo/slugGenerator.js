/**
 * services/seo/slugGenerator.js
 *
 * SEO-friendly slug generation from focus keyword or title.
 *
 * English:  Standard slugify (lowercase, hyphens, ASCII)
 * Marathi:  Phonetic Devanagari → Latin transliteration then slugify
 *
 * Yoast requires the focus keyphrase to be present in the slug.
 * This module ensures that by generating the slug FROM the keyword.
 */

// ── Phonetic Devanagari → Latin map ─────────────────────────────────────────
// Covers common Marathi vowels, consonants and matras used in news keyphrases.
const DEVANAGARI_MAP = {
  // Independent vowels
  "अ": "a",  "आ": "aa", "इ": "i",  "ई": "ee", "उ": "u",  "ऊ": "oo",
  "ए": "e",  "ऐ": "ai", "ओ": "o",  "औ": "au", "ऋ": "ri", "अं": "an",
  "अः": "ah",

  // Consonants
  "क": "k",  "ख": "kh", "ग": "g",  "घ": "gh", "ङ": "ng",
  "च": "ch", "छ": "chh","ज": "j",  "झ": "jh", "ञ": "ny",
  "ट": "t",  "ठ": "th", "ड": "d",  "ढ": "dh", "ण": "n",
  "त": "t",  "थ": "th", "द": "d",  "ध": "dh", "न": "n",
  "प": "p",  "फ": "ph", "ब": "b",  "भ": "bh", "म": "m",
  "य": "y",  "र": "r",  "ल": "l",  "व": "v",  "श": "sh",
  "ष": "sh", "स": "s",  "ह": "h",  "ळ": "l",  "क्ष": "ksh",
  "ज्ञ": "gya",

  // Matras (vowel diacritics attached to consonants)
  "ा": "a",  "ि": "i",  "ी": "ee", "ु": "u",  "ू": "oo",
  "े": "e",  "ै": "ai", "ो": "o",  "ौ": "au", "ृ": "ri",
  "ं": "n",  "ः": "h",  "ँ": "n",

  // Halant (virama — suppresses inherent vowel)
  "्": "",

  // Numbers
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

// Known whole-word overrides for common Marathi news words
const WORD_OVERRIDES = {
  "महाराष्ट्र":   "maharashtra",
  "नाशिक":        "nashik",
  "मुंबई":        "mumbai",
  "नवी":          "navi",
  "दिल्ली":       "delhi",
  "सरकार":        "sarkar",
  "पोलीस":        "police",
  "न्यायालय":     "nyayalay",
  "शेतकरी":       "shetkari",
  "विद्यार्थी":   "vidyarthi",
  "रस्ता":        "rasta",
  "पाणी":         "pani",
  "वीज":          "vij",
  "आरोग्य":       "arogya",
  "शिक्षण":       "shikshan",
  "निवडणूक":      "nivaadnuk",
  "ऊर्जा":        "urja",
  "संपन्न":       "sampann",
  "प्रकल्प":      "prakalp",
  "विकास":        "vikas",
  "योजना":        "yojana",
  "अर्थसंकल्प":  "arthasankalp",
};

/**
 * Transliterate a single Marathi/Devanagari word to Latin.
 * Uses word overrides first, then char-by-char map.
 */
function transliterateWord(word) {
  if (WORD_OVERRIDES[word]) return WORD_OVERRIDES[word];

  let result = "";
  let i = 0;

  while (i < word.length) {
    // Try 2-char sequences first (क्ष, ज्ञ, etc.)
    const two = word.slice(i, i + 2);
    if (DEVANAGARI_MAP[two] !== undefined) {
      result += DEVANAGARI_MAP[two];
      i += 2;
      continue;
    }
    const one = word[i];
    if (DEVANAGARI_MAP[one] !== undefined) {
      result += DEVANAGARI_MAP[one];
    } else if (/[a-zA-Z0-9]/.test(one)) {
      result += one; // pass through Latin chars unchanged
    }
    // Drop unknown Devanagari chars (punctuation, etc.)
    i++;
  }

  return result;
}

/**
 * Transliterate a full Marathi/Devanagari string to Latin.
 */
function transliterate(text) {
  return String(text)
    .trim()
    .split(/\s+/)
    .map(transliterateWord)
    .filter(Boolean)
    .join("-");
}

/**
 * Standard slugify for Latin/English text.
 */
function slugifyLatin(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

/**
 * Check if text contains Devanagari characters.
 */
function isDevanagari(text) {
  return /[\u0900-\u097F]/.test(String(text));
}

/**
 * Generate an SEO-friendly slug from a focus keyword (preferred)
 * or article title (fallback).
 *
 * @param {string} focusKeyword - The Yoast focus keyphrase
 * @param {string} title        - Article title (fallback)
 * @returns {string}            - Clean slug (max 100 chars)
 */
function generateSlug(focusKeyword, title = "") {
  const source = (focusKeyword || title || "").trim();
  if (!source) return "";

  let slug;

  if (isDevanagari(source)) {
    // Transliterate Marathi → Latin then slugify
    slug = slugifyLatin(transliterate(source));
  } else {
    // English: standard slugify
    slug = slugifyLatin(source);
  }

  // Safety: if slug is empty after processing, fall back to title slugify
  if (!slug && title) {
    slug = slugifyLatin(isDevanagari(title) ? transliterate(title) : title);
  }

  return slug.slice(0, 100);
}

/**
 * Ensure the focus keyword appears in the slug.
 * If the provided slug doesn't contain the keyword, prepend it.
 *
 * @param {string} slug         - Existing slug
 * @param {string} focusKeyword - Focus keyword
 * @returns {string}            - Corrected slug
 */
function ensureKeywordInSlug(slug, focusKeyword) {
  if (!focusKeyword || !slug) return slug;

  // If slug has Devanagari, transliterate it first
  if (/[\u0900-\u097F]/.test(slug)) {
    slug = generateSlug("", slug);
  }

  const keySlug = generateSlug(focusKeyword, "").slice(0, 50);
  const slugLow = slug.toLowerCase();

  // If already very long, don't prepend (likely already has all relevant words)
  if (slug.length > 80) return slug;

  // Check if any significant part of the keyword slug is already in the slug
  const parts   = keySlug.split("-").filter((p) => p.length > 2);
  const missing = parts.filter((p) => !slugLow.includes(p));

  // Only prepend if MORE THAN HALF the keyword parts are missing
  if (missing.length <= parts.length / 2) return slug;

  // Safety: don't prepend if slug already starts with keyword parts
  const slugParts = slug.split("-").slice(0, 2);
  const overlapCount = slugParts.filter(sp => keySlug.includes(sp)).length;
  if (overlapCount > 0) return slug; // slug likely derived from same source

  // Prepend keyword slug (but avoid duplication or overly long result)
  if (slugLow.includes(keySlug.slice(0, 10))) return slug;
  const combined = `${keySlug}-${slug}`.replace(/-+/g, "-").slice(0, 100);
  if (combined.length > 95) return slug; // result would be too long
  
  return combined;
}

module.exports = { generateSlug, ensureKeywordInSlug, transliterate, slugifyLatin };
