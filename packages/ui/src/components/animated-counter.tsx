"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface AnimatedCounterProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The target value to count towards */
  value: number;
  /** Duration of the count animation in ms (default 1500) */
  duration?: number;
  /** Format function for display (e.g. toLocaleString). Defaults to toLocaleString. */
  format?: (value: number) => string;
}

function AnimatedCounter({
  value,
  duration = 1500,
  format,
  className,
  ...props
}: AnimatedCounterProps) {
  const [displayed, setDisplayed] = React.useState(0);
  const prevValueRef = React.useRef(0);
  const rafRef = React.useRef<number>(0);

  const formatFn = format ?? ((v: number) => v.toLocaleString());

  React.useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setDisplayed(value);
      prevValueRef.current = value;
      return;
    }

    const start = prevValueRef.current;
    const end = value;
    if (start === end) return;

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - (1 - progress) ** 3;
      const current = Math.round(start + (end - start) * eased);
      setDisplayed(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevValueRef.current = end;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span
      className={cn("font-mono tabular-nums", className)}
      {...props}
    >
      {formatFn(displayed)}
    </span>
  );
}
AnimatedCounter.displayName = "AnimatedCounter";

export { AnimatedCounter };
