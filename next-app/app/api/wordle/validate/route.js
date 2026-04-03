import { NextResponse } from "next/server";
import ENGLISH_WORDS from "@/lib/wordle/english_words";
import MARATHI_WORDS from "@/lib/wordle/marathi_words";

export async function POST(request) {
  const body = await request.json();
  const { word, lang } = body || {};

  if (!word) {
    return NextResponse.json({ error: "word is required" }, { status: 400 });
  }

  const language = lang === "mr" ? "mr" : "en";
  const wordList = language === "mr" ? MARATHI_WORDS : ENGLISH_WORDS;
  const normalised = typeof word === "string" ? word.toUpperCase().trim() : "";
  const valid = wordList.includes(normalised) || wordList.includes(String(word).trim());

  return NextResponse.json({ valid, lang: language }, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
