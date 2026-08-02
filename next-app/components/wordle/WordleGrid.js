"use client";

import { useEffect, useRef } from "react";

function splitWord(word) {
  return [...word];
}

const STATE_STYLES = {
  correct: { bg: "hsl(var(--wordle-green))", border: "hsl(var(--wordle-green))", text: "#fff", borderWidth: "2px" },
  present: { bg: "hsl(var(--wordle-yellow))", border: "hsl(var(--wordle-yellow))", text: "#fff", borderWidth: "2px" },
  absent:  { bg: "hsl(var(--wordle-gray))",  border: "hsl(var(--wordle-gray))",  text: "#fff", borderWidth: "2px" },
  // empty and active use the SAME border colour so backspace causes zero visual change
  empty:   { bg: "transparent", border: "hsl(var(--border))", text: "hsl(var(--foreground))", borderWidth: "2px" },
  active:  { bg: "transparent", border: "hsl(var(--border))", text: "hsl(var(--foreground))", borderWidth: "2px" },
};

// Each tile side = (available height - keyboard ~160px - header ~48px - gaps ~30px) / 6 rows
// On a 700px screen: (700 - 65 - 48 - 160 - 30) / 6 ≈ 66px max
// clamp: min 42px, preferred 5.5svh, max 62px
function Tile({ letter, state, delay = 0, isPop = false }) {
  const isRevealed = ["correct", "present", "absent"].includes(state);
  const s = STATE_STYLES[state] || STATE_STYLES.empty;

  return (
    <div
      style={{
        // Tile size: clamp so 6 rows + 4-row Marathi keyboard all fit at ~768px
        // 4.8svh @ 768px = 36.8px → min 40px; @ 1080px = 51.8px; max 56px
        width:  "clamp(40px, 4.8svh, 56px)",
        height: "clamp(40px, 4.8svh, 56px)",
        backgroundColor: s.bg,
        borderColor: s.border,
        color: s.text,
        border: `${s.borderWidth} solid`,
        boxShadow: "none",
        animation: isRevealed
          ? `wordleFlip 0.5s ease-in-out ${delay}ms both`
          : isPop ? `wordlePop 0.1s ease-in-out both` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "4px",
        fontWeight: 800,
        fontSize: "clamp(16px, 2.6svh, 26px)",
        userSelect: "none",
        flexShrink: 0,
        margin: "0",
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
    // isPop: true only for the tile that just got a letter (the last typed tile)
    const isPop = isCurrentRow && i === currentInput.length - 1 && !!letter;
    tiles.push(<Tile key={i} letter={letter} state={state} delay={evaluations ? i * 80 : 0} isPop={isPop} />);
  }

  return (
    <div ref={rowRef} style={{ display: "flex", gap: "clamp(4px, 0.5svh, 5px)", justifyContent: "center" }}>
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
    <div
      style={{ display: "flex", flexDirection: "column", gap: "clamp(4px, 0.8svh, 8px)", alignItems: "center", padding: "4px 0" }}
      aria-label="Wordle grid"
    >
      {rows}
    </div>
  );
}
