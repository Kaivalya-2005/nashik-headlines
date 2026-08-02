"use client";

const EN_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["ENTER","Z","X","C","V","B","N","M","BACKSPACE"],
];

// Background/text for each letter state
const STATE_STYLE = {
  correct: { background: "hsl(var(--wordle-green))", color: "#fff" },
  present: { background: "hsl(var(--wordle-yellow))", color: "#fff" },
  absent:  { background: "hsl(var(--wordle-gray))",  color: "#fff" },
  default: { background: "hsl(var(--muted))",        color: "hsl(var(--foreground))" },
};

function Key({ label, state, onClick }) {
  const isAction = label === "ENTER" || label === "BACKSPACE";
  const display  = label === "BACKSPACE" ? "⌫" : label;
  const style    = isAction ? STATE_STYLE.default : (STATE_STYLE[state] || STATE_STYLE.default);

  return (
    <button
      type="button"
      onPointerDown={(e) => { e.preventDefault(); onClick(label); }}
      aria-label={label}
      // wordle-key / wordle-key-action supply responsive HEIGHT via globals.css
      // flex-[N] controls relative WIDTH within the row
      className={[
        isAction ? "wordle-key-action" : "wordle-key",
        isAction ? "flex-[1.65]" : "flex-1",
        "flex items-center justify-center rounded-[4px] font-bold select-none",
        "cursor-pointer transition-colors duration-75 active:scale-95",
        "text-[13px] sm:text-[15px] leading-none",
      ].join(" ")}
      style={{ ...style, border: "none", outline: "none" }}
    >
      <span aria-hidden>{display}</span>
    </button>
  );
}

export default function WordleKeyboard({ letterStates, onKey, lang, disabled }) {
  const rows = EN_ROWS;

  return (
    // The keyboard fills whatever column width its parent gives it
    <div
      className={`w-full px-2 sm:px-3 ${disabled ? "opacity-60 pointer-events-none" : ""}`}
      aria-label="Virtual keyboard"
    >
      <div className="flex flex-col gap-[5px] sm:gap-[6px]">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-[5px] sm:gap-[6px] w-full">
            {row.map((key) => (
              <Key
                key={key}
                label={key}
                state={letterStates[key] || "default"}
                onClick={onKey}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
