"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { GAME_THEMES, type GameTheme } from "./game-theme-provider";

export interface AnimatedBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle";
  /** Override primary blob color (defaults to coral) */
  primaryColor?: string;
  /** Override secondary blob color (defaults to teal) */
  secondaryColor?: string;
  /** Use per-game blob colors from GAME_THEMES */
  gameId?: string;
}

function AnimatedBackground({
  variant = "default",
  primaryColor,
  secondaryColor,
  gameId,
  className,
  ...props
}: AnimatedBackgroundProps) {
  const filterId = React.useId();

  let coral = primaryColor ?? "oklch(0.72 0.22 25)";
  let teal = secondaryColor ?? "oklch(0.70 0.15 185)";

  if (gameId && !primaryColor && !secondaryColor) {
    const theme = GAME_THEMES[gameId as GameTheme];
    if (theme) {
      coral = theme.primaryBlob;
      teal = theme.secondaryBlob;
    }
  }

  return (
    <div
      className={cn("fixed inset-0 -z-10 overflow-hidden", className)}
      aria-hidden="true"
      style={{ contain: "strict" }}
      {...props}
    >
      {/* Background base */}
      <div className="absolute inset-0 bg-bg-deep" />

      {/* Layer 1: Coral blob — top-left, slow drift */}
      <div
        className="absolute -left-[20%] -top-[20%] h-[70%] w-[70%] will-change-transform"
        style={{
          background: `radial-gradient(ellipse at center, ${coral.replace(")", " / 0.16)")}, transparent 70%)`,
          animation: "bgBlobA 28s ease-in-out infinite alternate",
        }}
      />

      {/* Layer 2: Teal blob — bottom-right, offset drift */}
      <div
        className="absolute -bottom-[15%] -right-[15%] h-[65%] w-[65%] will-change-transform"
        style={{
          background: `radial-gradient(ellipse at center, ${teal.replace(")", " / 0.14)")}, transparent 70%)`,
          animation: "bgBlobB 32s ease-in-out infinite alternate",
        }}
      />

      {/* Layer 3: Secondary coral highlight — center-right */}
      {variant === "default" && (
        <div
          className="absolute right-[10%] top-[30%] h-[45%] w-[45%] will-change-transform"
          style={{
            background: `radial-gradient(ellipse at center, ${coral.replace(")", " / 0.05)")}, transparent 70%)`,
            animation: "bgBlobC 24s ease-in-out infinite alternate",
          }}
        />
      )}

      {/* Layer 4: Accent purple blob — smaller, faster cycle */}
      {variant === "default" && (
        <div
          className="absolute left-[15%] bottom-[20%] h-[30%] w-[30%] will-change-transform"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0.65 0.20 280 / 0.10), transparent 70%)",
            animation: "bgBlobD 18s ease-in-out infinite alternate",
          }}
        />
      )}

      {/* Layer 5: Dot grid */}
      <div
        className={cn(
          "absolute inset-0",
          variant === "subtle" ? "opacity-[0.02]" : "opacity-[0.035]",
        )}
        style={{
          backgroundImage:
            "radial-gradient(circle at center, oklch(0.95 0.01 80) 0.5px, transparent 0.5px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Layer 6: SVG noise texture */}
      <svg
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full",
          variant === "subtle" ? "opacity-[0.01]" : "opacity-[0.02]",
        )}
      >
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>

      <style>{`
        @keyframes bgBlobA {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(4%, 6%) scale(1.08); }
          100% { transform: translate(-2%, 3%) scale(0.95); }
        }
        @keyframes bgBlobB {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(-5%, -4%) scale(1.1); }
          100% { transform: translate(3%, -2%) scale(0.97); }
        }
        @keyframes bgBlobC {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(-3%, 5%) scale(1.05); }
          100% { transform: translate(2%, -3%) scale(0.98); }
        }
        @keyframes bgBlobD {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(5%, -3%) scale(1.1); }
          100% { transform: translate(-3%, 4%) scale(0.95); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes bgBlobA { 0%, 100% { transform: none; } }
          @keyframes bgBlobB { 0%, 100% { transform: none; } }
          @keyframes bgBlobC { 0%, 100% { transform: none; } }
          @keyframes bgBlobD { 0%, 100% { transform: none; } }
        }
      `}</style>
    </div>
  );
}
AnimatedBackground.displayName = "AnimatedBackground";

export { AnimatedBackground };
