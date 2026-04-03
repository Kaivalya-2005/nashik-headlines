const express = require("express");
const router = express.Router();

const ENGLISH_WORDS = require("../data/english_words");
const MARATHI_WORDS = require("../data/marathi_words");

// Returns YYYY-MM-DD for a given Date (server local date)
function getDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Deterministic index: days since a fixed epoch % word list length
// Using 2024-01-01 as the start date
const EPOCH = new Date("2024-01-01T00:00:00+05:30"); // IST midnight

function getTodayIndex(wordList) {
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceEpoch = Math.floor((now - EPOCH) / msPerDay);
  return daysSinceEpoch % wordList.length;
}

/**
 * GET /api/wordle/today
 * Query: ?lang=en (default) | ?lang=mr
 *
 * Response:
 * {
 *   "date": "YYYY-MM-DD",
 *   "word": "APPLE",
 *   "lang": "en",
 *   "wordCount": 240
 * }
 */
router.get("/today", (req, res) => {
  const lang = req.query.lang === "mr" ? "mr" : "en";
  const wordList = lang === "mr" ? MARATHI_WORDS : ENGLISH_WORDS;

  if (!wordList || wordList.length === 0) {
    return res.status(500).json({ error: "Word list is empty" });
  }

  const index = getTodayIndex(wordList);
  const word = wordList[index];
  const date = getDateString(new Date());

  res.json({
    date,
    word,
    lang,
    wordCount: wordList.length,
  });
});

/**
 * POST /api/wordle/validate
 * Body: { word: "APPLE", lang: "en" }
 * Returns whether the word exists in our word list (for client-side validation)
 */
router.post("/validate", (req, res) => {
  const { word, lang } = req.body;
  if (!word) return res.status(400).json({ error: "word is required" });

  const language = lang === "mr" ? "mr" : "en";
  const wordList = language === "mr" ? MARATHI_WORDS : ENGLISH_WORDS;
  const normalised = typeof word === "string" ? word.toUpperCase().trim() : "";
  const valid = wordList.includes(normalised) || wordList.includes(word.trim());

  res.json({ valid, lang: language });
});

module.exports = router;
