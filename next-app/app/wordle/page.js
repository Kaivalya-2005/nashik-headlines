import WordleGame from "@/components/wordle/WordleGame";

export const metadata = {
  title: "Wordle — Nashik Headlines",
  description:
    "Play Nashik Headlines Wordle — guess the 5-letter word in 6 attempts. Available in English and Marathi (मराठी). New word every day!",
  openGraph: {
    title: "Wordle — Nashik Headlines",
    description:
      "Play the daily Wordle puzzle in English or Marathi on Nashik Headlines.",
  },
};

export default function WordlePage() {
  return (
    // overflow-hidden prevents body scroll — the game is self-contained within the dvh container
    <main className="overflow-hidden bg-background">
      <WordleGame />
    </main>
  );
}

