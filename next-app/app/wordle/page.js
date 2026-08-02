import WordleGame from "@/components/wordle/WordleGame";

export const metadata = {
  title: "Wordle — Nashik Headlines",
  description:
    "Play Nashik Headlines Wordle — guess the 5-letter word in 6 attempts. New word every day!",
  openGraph: {
    title: "Wordle — Nashik Headlines",
    description:
      "Play the daily Wordle puzzle in English on Nashik Headlines.",
  },
};

export default function WordlePage() {
  return (
    <main className="h-full min-h-0 overflow-hidden bg-background">
      <WordleGame />
    </main>
  );
}

