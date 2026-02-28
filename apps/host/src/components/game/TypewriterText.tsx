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

  useEffect(() => {
    // Reset when text changes
    setDisplayed("");
    indexRef.current = 0;
    completedRef.current = false;
    setShowCursor(true);

    if (!text) return;

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        const nextIndex = indexRef.current + 1;
        setDisplayed(text.slice(0, nextIndex));
        indexRef.current = nextIndex;

        // Vary speed based on punctuation
        const char = text[indexRef.current - 1];
        if (char === "." || char === "!" || char === "?") {
          clearInterval(interval);
          setTimeout(() => {
            // Re-trigger the effect by calling the interval logic again
            startTyping();
          }, speed * 6);
        } else if (char === ",") {
          clearInterval(interval);
          setTimeout(() => {
            startTyping();
          }, speed * 3);
        }
      } else if (!completedRef.current) {
        completedRef.current = true;
        clearInterval(interval);
        // Keep cursor blinking for a moment, then hide
        setTimeout(() => {
          setShowCursor(false);
          onComplete?.();
        }, 1500);
      }
    }, speed);

    function startTyping() {
      const nextInterval = setInterval(() => {
        if (indexRef.current < text.length) {
          const nextIndex = indexRef.current + 1;
          setDisplayed(text.slice(0, nextIndex));
          indexRef.current = nextIndex;

          const char = text[indexRef.current - 1];
          if (char === "." || char === "!" || char === "?") {
            clearInterval(nextInterval);
            setTimeout(() => startTyping(), speed * 6);
          } else if (char === ",") {
            clearInterval(nextInterval);
            setTimeout(() => startTyping(), speed * 3);
          }
        } else if (!completedRef.current) {
          completedRef.current = true;
          clearInterval(nextInterval);
          setTimeout(() => {
            setShowCursor(false);
            onComplete?.();
          }, 1500);
        }
      }, speed);
    }

    return () => {
      clearInterval(interval);
    };
  }, [text, speed, onComplete]);

  return (
    <div className={`font-display text-[32px] leading-relaxed md:text-[40px] ${className}`}>
      {displayed}
      {showCursor && <span className="ml-1 inline-block animate-pulse text-accent-1">|</span>}
    </div>
  );
}
