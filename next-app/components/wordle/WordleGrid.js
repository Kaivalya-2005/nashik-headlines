"use client";

import { useEffect, useRef } from "react";

function splitWord(word) {
  return [...word];
}

const STATE_STYLES = {
  correct: { bg: "hsl(var(--wordle-green))", border: "hsl(var(--wordle-green))", text: "#fff" },
  present: { bg: "hsl(var(--wordle-yellow))", border: "hsl(var(--wordle-yellow))", text: "#fff" },
  absent:  { bg: "hsl(var(--wordle-gray))",  border: "hsl(var(--wordle-gray))",  text: "#fff" },
  empty:   { bg: "transparent", border: "hsl(var(--border))", text: "hsl(var(--foreground))" },
  active:  { bg: "transparent", border: "hsl(var(--primary))", text: "hsl(var(--foreground))" },
};

// Tile — clamped square that looks great at any screen size
// clamp(40px, 11vw, 56px): 375px→41px | 414px→46px | 768px→56px (capped)
function Tile({ letter, state, delay = 0 }) {
  const isRevealed = ["correct", "present", "absent"].includes(state);
  const s = STATE_STYLES[state] || STATE_STYLES.empty;

  return (
    <div
      style={{
        width: "clamp(40px, 11vw, 56px)",
        height: "clamp(40px, 11vw, 56px)",
        backgroundColor: s.bg,
        borderColor: s.border,
        color: s.text,
        border: "2px solid",
        animation: isRevealed ? `wordleFlip 0.5s ease-in-out ${delay}ms both` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "6px",
        fontWeight: 700,
        fontSize: "clamp(14px, 3.5vw, 20px)",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}

function Row({ chars, evaluations, isInvalid, isCurrentRow, currentInput, wordLength }) {
  const rowRef = useRef(null);

  useEffect(() => {
    if (isInvalid && rowRef.current) {
      rowRef.current.style.animation = "none";
      void rowRef.current.offsetWidth;
      rowRef.current.style.animation = "wordleBounce 0.5s ease both";
    }
  }, [isInvalid]);

  const tiles = [];
  for (let i = 0; i < wordLength; i++) {
    let letter = "";
    let state = "empty";
    if (evaluations && chars) {
      const charArr = splitWord(chars);
      letter = charArr[i] || "";
      state = evaluations[i] || "empty";
    } else if (isCurrentRow) {
      letter = currentInput[i] || "";
      state = letter ? "active" : "empty";
    }
    tiles.push(<Tile key={i} letter={letter} state={state} delay={evaluations ? i * 80 : 0} />);
  }

  return (
    <div ref={rowRef} style={{ display: "flex", gap: "6px" }}>
      {tiles}
    </div>
  );
}

export default function WordleGrid({
  guesses, evaluations, currentInput, currentRow,
  invalidRow, lang, wordLength = 5, maxGuesses = 6,
}) {
  const rows = [];
  for (let r = 0; r < maxGuesses; r++) {
    if (r < guesses.length) {
      rows.push(
        <Row key={r} chars={guesses[r]} evaluations={evaluations[r]}
          isInvalid={false} isCurrentRow={false} currentInput={[]}
          lang={lang} wordLength={wordLength} />
      );
    } else if (r === currentRow) {
      rows.push(
        <Row key={r} chars={null} evaluations={null}
          isInvalid={invalidRow} isCurrentRow currentInput={currentInput}
          lang={lang} wordLength={wordLength} />
      );
    } else {
      rows.push(
        <Row key={r} chars={null} evaluations={null}
          isInvalid={false} isCurrentRow={false} currentInput={[]}
          lang={lang} wordLength={wordLength} />
      );
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }} aria-label="Wordle grid">
      {rows}
    </div>
  );
}
