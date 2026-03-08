"use client";

import gsap from "gsap";
import * as React from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { emitMotionEvent } from "../lib/audio";
import { cn } from "../lib/utils";

export interface VerdictStampProps extends React.HTMLAttributes<HTMLDivElement> {
  verdict: "correct" | "wrong";
  show: boolean;
  onComplete?: () => void;
}

function VerdictStamp({ verdict, show, onComplete, className, ...props }: VerdictStampProps) {
  const stampRef = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const onCompleteRef = React.useRef(onComplete);
  const hasAnimated = React.useRef(false);

  React.useLayoutEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  React.useEffect(() => {
    if (!show || hasAnimated.current) return;
    hasAnimated.current = true;

    const el = stampRef.current;
    if (!el) {
      onCompleteRef.current?.();
      return;
    }

    emitMotionEvent("verdict-stamp.show", { verdict });

    if (reduced) {
      gsap.set(el, { scale: 1, opacity: 1 });
      onCompleteRef.current?.();
      return;
    }

    gsap.fromTo(
      el,
      { scale: 3, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.4,
        ease: "power4.out",
        onComplete: () => {
          onCompleteRef.current?.();
        },
      },
    );
  }, [show, verdict, reduced]);

  // Reset animation state when show becomes false
  React.useEffect(() => {
    if (!show) {
      hasAnimated.current = false;
      const el = stampRef.current;
      if (el) {
        gsap.set(el, { scale: 3, opacity: 0 });
      }
    }
  }, [show]);

  if (!show) return null;

  const isCorrect = verdict === "correct";

  return (
    <div
      ref={stampRef}
      className={cn(
        "pointer-events-none select-none text-center font-black uppercase tracking-wider",
        isCorrect ? "text-green-400" : "text-red-500",
        className,
      )}
      style={{
        fontSize: "clamp(2rem, 8vw, 5rem)",
        textShadow: isCorrect
          ? "0 0 20px oklch(0.72 0.2 145 / 0.5)"
          : "0 0 20px oklch(0.55 0.25 25 / 0.5)",
        opacity: 0,
        transform: "scale(3)",
      }}
      {...props}
    >
      {isCorrect ? "CORRECT" : "WRONG"}
    </div>
  );
}
VerdictStamp.displayName = "VerdictStamp";

export { VerdictStamp };
