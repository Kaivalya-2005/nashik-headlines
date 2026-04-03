"use client";

import { useEffect, useRef } from "react";

export default function WordleToast({ message }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      if (message) {
        ref.current.style.animation = "none";
        void ref.current.offsetWidth;
        ref.current.style.animation = "wordleToastIn 0.25s ease-out forwards";
      }
    }
  }, [message]);

  if (!message) return null;

  return (
    <div
      ref={ref}
      className="
        fixed top-20 left-1/2 -translate-x-1/2 z-[100]
        px-5 py-2.5 rounded-full
        bg-foreground text-background
        text-sm font-semibold shadow-elevated
        pointer-events-none select-none
        whitespace-nowrap
      "
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
