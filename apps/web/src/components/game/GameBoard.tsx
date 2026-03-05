"use client";

/**
 * GameBoard — Responsive split layout wrapper.
 * On larger screens: board (top ~60%) + controls (bottom ~40%).
 * On mobile/small screens: stacked vertically, scrollable.
 */

interface GameBoardProps {
  board: React.ReactNode;
  controls: React.ReactNode;
  /** Optional floating overlay (e.g. host controls) */
  overlay?: React.ReactNode;
}

export function GameBoard({ board, controls, overlay }: GameBoardProps) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* Board section — scrollable, takes ~60% on large screens */}
      <div className="flex-[3] overflow-y-auto">{board}</div>

      {/* Controls section — takes ~40% on large screens */}
      <div className="flex-[2] border-t border-white/10 bg-bg-deep/80 backdrop-blur-sm overflow-y-auto">
        {controls}
      </div>

      {/* Floating overlay (host controls, etc.) */}
      {overlay}
    </div>
  );
}
