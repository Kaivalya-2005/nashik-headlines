"use client";

const EN_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["ENTER","Z","X","C","V","B","N","M","BACKSPACE"],
];

const MR_ROWS = [
  ["क","ख","ग","घ","च","छ","ज","झ","ट"],
  ["ड","त","थ","द","ध","न","प","फ","ब"],
  ["भ","म","य","र","ल","व","श","स","ह"],
  ["ा","ि","ी","ु","ू","े","ै","ो","ौ"],
  ["ENTER","अ","इ","उ","ए","ओ","ं","ः","BACKSPACE"],
];

const STATE_CLS = {
  correct: "bg-[hsl(var(--wordle-green))] text-white border-transparent",
  present: "bg-[hsl(var(--wordle-yellow))] text-white border-transparent",
  absent:  "bg-[hsl(var(--wordle-gray))] text-white border-transparent",
  default: "bg-secondary text-foreground border-border hover:bg-muted active:bg-muted",
};

function Key({ label, state, onClick, isMarathi }) {
  const isAction = label === "ENTER" || label === "BACKSPACE";
  const display = label === "BACKSPACE" ? "⌫" : label === "ENTER" ? "↵" : label;
  const cls = isAction ? STATE_CLS.default : (STATE_CLS[state] || STATE_CLS.default);

  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(label); }}
      className={`
        border rounded font-semibold select-none cursor-pointer
        transition-colors duration-100 active:scale-90
        flex items-center justify-center
        ${isMarathi ? "h-9 text-[13px]" : "h-10 text-sm"}
        ${isAction ? "px-2 flex-shrink-0 text-xs" : "flex-1 min-w-0"}
        ${cls}
      `}
      aria-label={label}
    >
      {display}
    </button>
  );
}

export default function WordleKeyboard({ letterStates, onKey, lang, disabled }) {
  const rows = lang === "mr" ? MR_ROWS : EN_ROWS;
  const isMarathi = lang === "mr";

  return (
    <div
      className={`px-2 py-2 flex flex-col gap-1.5 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      aria-label="Virtual keyboard"
    >
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-1 w-full max-w-[500px] mx-auto">
          {row.map((key) => (
            <Key
              key={key}
              label={key}
              state={letterStates[key] || "default"}
              onClick={onKey}
              isMarathi={isMarathi}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
