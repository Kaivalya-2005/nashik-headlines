import { NextResponse } from "next/server";
import ENGLISH_WORDS from "@/lib/wordle/english_words";
import MARATHI_WORDS from "@/lib/wordle/marathi_words";

export const revalidate = 3600;

function getDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const EPOCH = new Date("2024-01-01T00:00:00+05:30");

function getTodayIndex(wordList) {
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceEpoch = Math.floor((now - EPOCH) / msPerDay);
  return daysSinceEpoch % wordList.length;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") === "mr" ? "mr" : "en";
  const wordList = lang === "mr" ? MARATHI_WORDS : ENGLISH_WORDS;

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
      lang,
      wordCount: wordList.length,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
