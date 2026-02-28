"use client";

import { useEffect, useRef, useState } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function TypewriterText({
  text,
  speed = 40,
  className = "",
  onComplete,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const indexRef = useRef(0);
  const completedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const activeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Reset when text changes
    setDisplayed("");
    indexRef.current = 0;
    completedRef.current = false;
    setShowCursor(true);

    if (!text) return;

    function startTyping() {
      const nextInterval = setInterval(() => {
        if (indexRef.current < text.length) {
          const nextIndex = indexRef.current + 1;
          setDisplayed(text.slice(0, nextIndex));
          indexRef.current = nextIndex;

          const char = text[indexRef.current - 1];
          if (char === "." || char === "!" || char === "?") {
            clearInterval(nextInterval);
            const tid = setTimeout(() => startTyping(), speed * 6);
            timeoutsRef.current.push(tid);
          } else if (char === ",") {
            clearInterval(nextInterval);
            const tid = setTimeout(() => startTyping(), speed * 3);
            timeoutsRef.current.push(tid);
          }
        } else if (!completedRef.current) {
          completedRef.current = true;
          clearInterval(nextInterval);
          const tid = setTimeout(() => {
            setShowCursor(false);
            onComplete?.();
          }, 1500);
          timeoutsRef.current.push(tid);
        }
      }, speed);
      activeIntervalRef.current = nextInterval;
    }

    startTyping();

    return () => {
      if (activeIntervalRef.current !== null) {
        clearInterval(activeIntervalRef.current);
      }
      for (const t of timeoutsRef.current) clearTimeout(t);
      timeoutsRef.current = [];
    };
  }, [text, speed, onComplete]);

  return (
    <div className={`font-body text-[32px] leading-relaxed md:text-[40px] ${className}`}>
      {displayed}
      {showCursor && (
        <span
          className="ml-1 inline-block h-[1em] w-[0.5em] translate-y-[0.1em] rounded-sm bg-accent-1"
          style={{
            animation: "glow-breathe 1s ease-in-out infinite",
            boxShadow: "0 0 8px oklch(0.7 0.18 265 / 0.6)",
          }}
        />
      )}
    </div>
  );
}
