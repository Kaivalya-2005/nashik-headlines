import { NextResponse } from "next/server";
import ENGLISH_WORDS from "@/lib/wordle/english_words_shuffled";

export async function POST(request) {
  const body = await request.json();
  const { word } = body || {};

  if (!word) {
    return NextResponse.json({ error: "word is required" }, { status: 400 });
  }

  const normalised = typeof word === "string" ? word.toUpperCase().trim() : "";
  const valid = ENGLISH_WORDS.includes(normalised) || ENGLISH_WORDS.includes(String(word).trim());

  return NextResponse.json({ valid, lang: "en" }, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
