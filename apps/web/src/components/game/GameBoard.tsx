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
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden lg:overflow-hidden">
        <div className="flex min-h-full flex-col lg:h-full">
          {/* Board section — hero area on desktop, natural flow on mobile */}
          <div className="lg:min-h-0 lg:flex-[1.45] lg:overflow-y-auto lg:overflow-x-hidden">
            {board}
          </div>

          {/* Controls section — split pane on desktop, full-flow on mobile */}
          <div className="shrink-0 border-t border-white/10 bg-bg-deep/80 backdrop-blur-xl lg:h-[clamp(180px,38dvh,360px)] lg:overflow-y-auto">
            <div
              className="min-h-full"
              style={{
                paddingBottom: "calc(var(--hud-safe-bottom, env(safe-area-inset-bottom)) + 1rem)",
              }}
            >
              {controls}
            </div>
          </div>
        </div>
      </div>

      {/* Floating overlay (host controls, etc.) */}
      {overlay}
    </div>
  );
}
