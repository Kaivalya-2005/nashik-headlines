"use client";

import { useState, useEffect, useCallback } from "react";
import WordleGrid from "./WordleGrid";
import WordleKeyboard from "./WordleKeyboard";
import WordleToast from "./WordleToast";
import { Share2, HelpCircle, X } from "lucide-react";
import { Globe } from "lucide-react";

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const HELP_SEEN_SESSION_KEY = "nhWordleHelpSeenSession";

/* ─── Motivational lines ───────────────────────────────────────────────────── */
const MOTIVATIONS_EN = [
  "Expand your vocabulary, one word at a time! 📚",
  "A great mind knows many words. Keep going! 🧠",
  "Challenge yourself — words are your superpower! ⚡",
  "Every guess makes you sharper. Don't stop! 🎯",
  "Words unlock worlds. Guess your way in! 🌍",
  "Flex that vocabulary! You've got this. 💪",
  "Think smart, guess smart. You can do it! 🌟",
];

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function splitWord(word) { return [...word]; }

function evaluateGuess(guess, answer) {
  const g = splitWord(guess), a = splitWord(answer);
  const result = Array(WORD_LENGTH).fill("absent");
  const count = {};
  a.forEach((ch) => { count[ch] = (count[ch] || 0) + 1; });
  g.forEach((ch, i) => { if (ch === a[i]) { result[i] = "correct"; count[ch]--; } });
  g.forEach((ch, i) => { if (result[i] !== "correct" && count[ch] > 0) { result[i] = "present"; count[ch]--; } });
  return result;
}

function buildShareText(evaluations, won) {
  const msgMap = {
    1: "I'm on FIRE! Guessed it in just 1 try!",
    2: "Amazing! Got it in 2 tries!",
    3: "Great job! Solved in 3 tries!",
    4: "Nice! Nailed it in 4 tries!",
    5: "Got it! Took me 5 tries!",
    6: "Phew! Made it in 6 tries!",
    lost: "Better luck next time! I couldn't solve it today."
  };

  const mainMsg = won ? msgMap[evaluations.length] || msgMap[6] : msgMap.lost;
  const tryMsg = "You should try this challenge too!";
  
  return `${mainMsg}\n${tryMsg}\n\nPlay at: nashikheadlines.com/wordle`;
}

function getTodayKey(lang) {
  const d = new Date();
  return `nhWordle_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}_${lang}`;
}

function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight - now;
  const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/* ─── How To Play Modal ────────────────────────────────────────────────────── */
const TILE_COLORS = {
  correct: { background: "hsl(var(--wordle-green))", border: "hsl(var(--wordle-green))", color: "#fff" },
  present: { background: "hsl(var(--wordle-yellow))", border: "hsl(var(--wordle-yellow))", color: "#fff" },
  absent:  { background: "hsl(var(--wordle-gray))", border: "hsl(var(--wordle-gray))", color: "#fff" },
  empty:   { background: "transparent", border: "hsl(var(--border))", color: "inherit" },
};

function MiniTile({ letter, state }) {
  const s = TILE_COLORS[state] || TILE_COLORS.empty;
  return (
    <div style={{ width: 34, height: 34, borderRadius: 5, border: `2px solid ${s.border}`, background: s.background, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
      {letter}
    </div>
  );
}

function HowToPlayModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md px-3 py-3" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h2 className="font-headline font-bold text-lg">🎮 How To Play</h2>
            <p className="text-[11px] text-muted-foreground">For your first game</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors flex-shrink-0"><X size={18} /></button>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-foreground leading-snug">
            🎯 Guess the 5-letter word in 6 tries.
          </p>

          <div className="space-y-2">
            <div className="rounded-xl border border-border bg-secondary/40 p-2.5">
              <div className="flex gap-1.5 mb-1.5">
                {["F","O","R","G","E"].map((l, i) => (
                  <MiniTile key={i} letter={l} state={i === 0 ? "correct" : "absent"} />
                ))}
              </div>
              <p className="text-[11px] text-foreground">Green = correct spot</p>
            </div>

            <div className="rounded-xl border border-border bg-secondary/40 p-2.5">
              <div className="flex gap-1.5 mb-1.5">
                {["P","I","L","L","S"].map((l, i) => (
                  <MiniTile key={i} letter={l} state={i === 2 ? "present" : "absent"} />
                ))}
              </div>
              <p className="text-[11px] text-foreground">Yellow = in the word</p>
            </div>

            <div className="rounded-xl border border-border bg-secondary/40 p-2.5">
              <div className="flex gap-1.5 mb-1.5">
                {["B","R","A","I","N"].map((l, i) => (
                  <MiniTile key={i} letter={l} state="absent" />
                ))}
              </div>
              <p className="text-[11px] text-foreground">Gray = not in the word</p>
            </div>
          </div>

          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity active:scale-95">
            Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Result / Share Modal ─────────────────────────────────────────────────── */
function ResultModal({ won, evaluations, date, answer, onClose }) {
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const attemptsUsed = evaluations.length;
  const attemptsScore = won ? `${attemptsUsed}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const points = won ? (MAX_GUESSES - attemptsUsed + 1) * 10 : 0;
  const winMessages = ["Genius! 🧠", "Brilliant! 🎉", "Impressive! 🌟", "Splendid! 👏", "Great! 🏆", "Phew! 😅"];
  const winMsg = won ? winMessages[Math.min(evaluations.length - 1, 5)] : "Better luck tomorrow! 💪";
  
  const shareText = buildShareText(evaluations, won);

  const handleShare = async (platform) => {
    try {
      if (platform === "copy") {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        setShowShareMenu(false);
      } else if (platform === "whatsapp") {
        const msg = encodeURIComponent(shareText);
        window.open(`https://wa.me/?text=${msg}`, "_blank");
      } else if (platform === "twitter") {
        const msg = encodeURIComponent(shareText);
        window.open(`https://twitter.com/intent/tweet?text=${msg}`, "_blank");
      } else if (platform === "facebook") {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=nashikheadlines.com/wordle`, "_blank");
      } else if (platform === "email") {
        const subject = encodeURIComponent("Nashik Wordle");
        const body = encodeURIComponent(shareText);
        window.open(`mailto:?subject=${subject}&body=${body}`);
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-3xl shadow-elevated w-full max-w-sm animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success header with gradient background */}
        <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border-b border-emerald-200/50 px-6 pt-8 pb-6 text-center rounded-t-3xl">
          <p className="text-5xl mb-3">{won ? "🏆" : "💪"}</p>
          <p className="text-3xl font-headline font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-500 mb-1">{winMsg}</p>
          <p className="text-sm text-muted-foreground">
            {won
              ? `You guessed it in ${attemptsScore}`
              : `You used all ${MAX_GUESSES} tries`
            }
          </p>
        </div>

        {/* Content */}
        <div className="px-6 pt-6 pb-6 space-y-4 relative">
          {/* Score Card */}
          <div className="bg-secondary/60 rounded-2xl p-4 text-center border border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Today's Score</p>
            <p className="text-3xl font-mono font-bold text-primary">{points}</p>
            {won && (
              <p className="text-xs text-muted-foreground mt-1">
                {attemptsUsed} attempts • higher points for fewer tries
              </p>
            )}
          </div>

          {!won && answer && (
            <div className="bg-card rounded-2xl p-4 text-center border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Correct Word</p>
              <p className="text-3xl font-mono font-bold text-foreground tracking-[0.22em]">{answer}</p>
            </div>
          )}

          {/* Share Button with Dropdown */}
          <div className="relative z-[210]">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-bold text-base flex items-center justify-center gap-2 hover:shadow-lg transition-all active:scale-95"
            >
              <Share2 size={18} />
              {copied ? "Copied! ✓" : "Share 🚀"}
            </button>

            {/* Share Menu - positioned above button */}
            {showShareMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-[220] animate-fade-in-up">
                <button
                  onClick={() => handleShare("copy")}
                  className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex items-center gap-3 border-b border-border/50"
                >
                  <span className="text-lg">📋</span>
                  <span className="font-semibold text-sm">Copy to Clipboard</span>
                </button>
                <button
                  onClick={() => handleShare("whatsapp")}
                  className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex items-center gap-3 border-b border-border/50"
                >
                  <span className="text-lg">💬</span>
                  <span className="font-semibold text-sm">WhatsApp</span>
                </button>
                <button
                  onClick={() => handleShare("twitter")}
                  className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex items-center gap-3 border-b border-border/50"
                >
                  <span className="text-lg">𝕏</span>
                  <span className="font-semibold text-sm">X / Twitter</span>
                </button>
                <button
                  onClick={() => handleShare("facebook")}
                  className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex items-center gap-3 border-b border-border/50"
                >
                  <span className="text-lg">👥</span>
                  <span className="font-semibold text-sm">Facebook</span>
                </button>
                <button
                  onClick={() => handleShare("email")}
                  className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex items-center gap-3"
                >
                  <span className="text-lg">✉️</span>
                  <span className="font-semibold text-sm">Email</span>
                </button>
              </div>
            )}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-secondary/50 text-foreground font-semibold text-sm hover:bg-secondary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Game Component ──────────────────────────────────────────────────── */
export default function WordleGame() {
  const [answer, setAnswer] = useState(null);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [showHelp, setShowHelp] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Game
  const [guesses, setGuesses] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [currentInput, setCurrentInput] = useState([]);
  const [gameStatus, setGameStatus] = useState("playing");
  const [invalidRow, setInvalidRow] = useState(false);
  const [toast, setToast] = useState(null);
  const [letterStates, setLetterStates] = useState({});

  const motivation = MOTIVATIONS_EN[Math.floor(Date.now() / 86400000) % 7];

  const showToast = useCallback((msg, duration = 2000) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  }, []);

  const fetchWord = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/wordle/today`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAnswer(data.word); setDate(data.date);
    } catch { setError("Could not load today's word. Check your connection."); }
    finally { setLoading(false); }
  }, []);

  const loadState = useCallback(() => {
    try {
      const raw = localStorage.getItem(getTodayKey("en"));
      if (raw) {
        const s = JSON.parse(raw);
        setGuesses(s.guesses || []); setEvaluations(s.evaluations || []);
        setCurrentInput([]); setGameStatus(s.status || "playing"); setLetterStates(s.letterStates || {});
        return { loaded: true, status: s.status || "playing" };
      }
    } catch {}
    return { loaded: false, status: "playing" };
  }, []);

  const saveState = useCallback((gs, evals, status, ls) => {
    try { localStorage.setItem(getTodayKey("en"), JSON.stringify({ guesses: gs, evaluations: evals, status, letterStates: ls })); } catch {}
  }, []);

  // On mount
  useEffect(() => {
    setCurrentInput([]); setInvalidRow(false); setToast(null); setShowResult(false);
    const { loaded, status } = loadState();
    if (!loaded) { setGuesses([]); setEvaluations([]); setGameStatus("playing"); setLetterStates({}); }
    fetchWord();

    // Show help modal on first tab open (session-based, not permanent)
    if (!sessionStorage.getItem(HELP_SEEN_SESSION_KEY)) {
      setShowHelp(true);
      sessionStorage.setItem(HELP_SEEN_SESSION_KEY, "1");
    }

    // If already completed today, show result after a short delay
    if (loaded && (status === "won" || status === "lost")) {
      setTimeout(() => setShowResult(true), 800);
    }
  }, [fetchWord, loadState]);

  const submitGuess = useCallback(() => {
    if (!answer) return;
    if (currentInput.length !== WORD_LENGTH) {
      showToast("Not enough letters");
      setInvalidRow(true); setTimeout(() => setInvalidRow(false), 600);
      return;
    }
    const inputStr = currentInput.join("");
    const evaluation = evaluateGuess(inputStr, answer);
    const newGuesses = [...guesses, inputStr];
    const newEvals = [...evaluations, evaluation];
    const newLS = { ...letterStates };
    const priority = { correct: 3, present: 2, absent: 1 };
    splitWord(inputStr).forEach((ch, i) => { const s = evaluation[i]; if (!newLS[ch] || priority[s] > priority[newLS[ch]]) newLS[ch] = s; });

    let newStatus = "playing";
    if (evaluation.every((s) => s === "correct")) newStatus = "won";
    else if (newGuesses.length >= MAX_GUESSES) newStatus = "lost";

    setGuesses(newGuesses); setEvaluations(newEvals); setCurrentInput([]);
    setGameStatus(newStatus); setLetterStates(newLS);
    saveState("en", newGuesses, newEvals, newStatus, newLS);

    if (newStatus === "won" || newStatus === "lost") {
      // Brief toast then open result modal
      const msg = newStatus === "won"
        ? ["Genius! 🧠","Brilliant! 🎉","Impressive! 🌟","Splendid! 👏","Great! 🏆","Phew! 😅"][Math.min(newGuesses.length-1,5)]
        : `The word was: ${answer}`;
      showToast(msg, 1500);
      setTimeout(() => setShowResult(true), 1800);
    }
  }, [answer, currentInput, guesses, evaluations, letterStates, showToast, saveState]);

  const handleKey = useCallback((key) => {
    if (gameStatus !== "playing" || !answer) return;
    if (key === "ENTER" || key === "Enter") { submitGuess(); return; }
    if (key === "BACKSPACE" || key === "Backspace") { setCurrentInput((p) => p.slice(0,-1)); return; }
    if (/^[A-Za-z]$/.test(key) && currentInput.length < WORD_LENGTH) setCurrentInput((p) => [...p, key.toUpperCase()]);
  }, [gameStatus, answer, currentInput, submitGuess]);

  useEffect(() => {
    const fn = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Backspace") {
        e.preventDefault();
        handleKey(e.key);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        handleKey(e.key);
        return;
      }

      handleKey(e.key);
    };

    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [handleKey]);

  return (
    <>
      {/* ── Full-screen game container ─────────────────────────────────── */}
      {/* wordle-container: responsive height set in globals.css
           65px on mobile (no category nav), 106px on desktop */}
      <div className="wordle-container bg-background">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-border bg-card/95 backdrop-blur-sm z-10" style={{ height: 48 }}>
          <div className="relative flex items-center justify-between gap-2 px-3 sm:px-4 h-full">
            <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
              <h1 className="font-headline font-bold text-base sm:text-lg tracking-tight whitespace-nowrap">
                Wordle
              </h1>
              <button
                onClick={() => setShowHelp(true)}
                className="p-1 rounded-full hover:bg-secondary transition-colors flex-shrink-0"
                aria-label="How to play"
                title="How to play"
              >
                <HelpCircle size={15} className="text-muted-foreground" />
              </button>
            </div>

            <p className="pointer-events-none absolute left-1/2 top-1/2 hidden max-w-[50%] -translate-x-1/2 -translate-y-1/2 truncate text-center text-xs text-muted-foreground italic leading-tight sm:block">
              {motivation}
            </p>

            <div className="flex items-center gap-2 flex-shrink-0">
              {date && <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{date}</span>}
              <button
                onClick={() => {}}
                className="flex items-center gap-1 px-2 py-1 rounded-full border border-border bg-secondary/60 hover:bg-secondary text-[10px] sm:text-xs font-bold transition-all active:scale-95"
                title="English only"
              >
                <Globe size={11} className="text-muted-foreground flex-shrink-0" />
                <span className="hidden sm:inline">English</span>
                <span className="sm:hidden">EN</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Toast ─────────────────────────────────────────────────── */}
        <WordleToast message={toast} />

        {/* ── States ────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}
        {error && (
          <div className="flex-1 flex items-center justify-center px-6 text-center">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* ── Game ── grid + keyboard in centred column */}
        {!loading && !error && answer && (
          <div className="wordle-game-col">

            {/* Grid — fills remaining vertical space, centred */}
            <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden py-2 sm:py-3">
              <WordleGrid
                guesses={guesses}
                evaluations={evaluations}
                currentInput={currentInput}
                currentRow={guesses.length}
                invalidRow={invalidRow}
                lang="en"
                wordLength={WORD_LENGTH}
                maxGuesses={MAX_GUESSES}
              />
            </div>

            {/* View Result button */}
            {gameStatus !== "playing" && !showResult && (
              <div className="flex-shrink-0 flex justify-center py-1">
                <button
                  onClick={() => setShowResult(true)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-sm flex items-center gap-2 hover:shadow-lg hover:scale-105 transition-all active:scale-95 border border-primary/30 shadow-md"
                >
                  <Share2 size={15} />
                  🎉 View Result
                </button>
              </div>
            )}

            {/* Keyboard — always visible at bottom of column */}
            <div className="flex-shrink-0 border-t border-border/40 bg-card/90 py-1.5 sm:py-2.5">
              <WordleKeyboard
                letterStates={letterStates}
                onKey={handleKey}
                lang="en"
                disabled={gameStatus !== "playing"}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {showHelp && <HowToPlayModal onClose={() => setShowHelp(false)} />}
      {showResult && (
        <ResultModal
          won={gameStatus === "won"}
          evaluations={evaluations}
          date={date}
          answer={answer}
          onClose={() => setShowResult(false)}
        />
      )}

      {/* no fixed keyboard — keyboard is rendered in-page above */}
    </>
  );
}
