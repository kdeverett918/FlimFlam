"use client";

import { haptics } from "@flimflam/ui";
import { useCallback, useState } from "react";

export type CellState =
  | "available"
  | "read-only"
  | "answered-correct"
  | "answered-wrong"
  | "answered-neutral"
  | "power-play";

interface BoardCellProps {
  value: number;
  state: CellState;
  isSelector: boolean;
  onSelect?: () => void;
  ariaLabel?: string;
}

export function BoardCell({ value, state, isSelector, onSelect, ariaLabel }: BoardCellProps) {
  const [rippling, setRippling] = useState(false);

  const handleClick = useCallback(() => {
    if (state !== "available" || !isSelector || !onSelect) return;
    haptics.tap();
    setRippling(true);
    setTimeout(() => setRippling(false), 400);
    onSelect();
  }, [state, isSelector, onSelect]);

  const isAnswered =
    state === "answered-correct" || state === "answered-wrong" || state === "answered-neutral";
  const isAvailable = state === "available";
  const isPowerPlay = state === "power-play";
  const isInteractive = isAvailable && isSelector;

  const baseClasses =
    "flex items-center justify-center rounded-lg font-mono font-bold transition-all";
  const sizeClasses = "min-h-[48px] text-sm sm:min-h-[56px] sm:text-base";

  let stateClasses: string;
  if (isAnswered) {
    const tint =
      state === "answered-correct"
        ? "border-success/30 bg-success/10"
        : state === "answered-wrong"
          ? "border-accent-6/30 bg-accent-6/10"
          : "border-white/10 bg-bg-surface/50";
    stateClasses = `${tint} text-text-dim line-through`;
  } else if (isPowerPlay) {
    stateClasses =
      "border border-amber-400/40 bg-amber-400/10 text-amber-300 animate-power-play-pulse";
  } else if (isInteractive) {
    stateClasses =
      "border border-accent-brainboard/35 bg-accent-brainboard/12 text-accent-3 backdrop-blur-sm active:scale-95 cursor-pointer shadow-[0_0_12px_oklch(0.68_0.22_265/0.15)] hover:shadow-[0_0_20px_oklch(0.68_0.22_265/0.25)] hover:border-accent-brainboard/50 focus-visible:ring-2 focus-visible:ring-accent-brainboard/50";
  } else if (state === "read-only") {
    stateClasses =
      "border border-accent-brainboard/20 bg-accent-brainboard/5 text-accent-3/50 cursor-default";
  } else {
    stateClasses = "border border-accent-brainboard/30 bg-accent-brainboard/10 text-accent-3";
  }

  const rippleClass = rippling && !isAnswered ? "animate-value-ripple" : "";

  return (
    <button
      type="button"
      disabled={isAnswered || !isInteractive}
      onClick={handleClick}
      className={`${baseClasses} ${sizeClasses} ${stateClasses} ${rippleClass}`}
      style={{ touchAction: "manipulation" }}
      aria-label={ariaLabel}
    >
      {isAnswered ? "" : `$${value}`}
    </button>
  );
}
