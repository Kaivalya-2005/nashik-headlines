import { NextResponse } from "next/server";
import ENGLISH_WORDS from "@/lib/wordle/english_words_shuffled";

export const revalidate = 0;

function getDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Use IST (UTC+5:30) to determine today's date for consistent daily word
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const EPOCH_IST = new Date("2024-01-01T00:00:00+05:30").getTime();

function getTodayIndex(wordList) {
  const nowIST = Date.now() + IST_OFFSET_MS;
  const epochIST = EPOCH_IST + IST_OFFSET_MS;
  const daysSinceEpoch = Math.floor((nowIST - epochIST) / (24 * 60 * 60 * 1000));
  return ((daysSinceEpoch % wordList.length) + wordList.length) % wordList.length;
}

export async function GET(request) {
  const wordList = ENGLISH_WORDS;

  if (!wordList || wordList.length === 0) {
    return NextResponse.json({ error: "Word list is empty" }, { status: 500 });
  }

  const index = getTodayIndex(wordList);
  const word = wordList[index];
  const date = getDateString(new Date());

  return NextResponse.json(
    {
      date,
      word,
      lang: "en",
      wordCount: wordList.length,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
