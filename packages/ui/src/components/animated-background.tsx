import * as React from "react";
import { cn } from "../lib/utils";

interface AnimatedBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle";
}

function AnimatedBackground({ variant = "default", className, ...props }: AnimatedBackgroundProps) {
  const filterId = React.useId();

  return (
    <div
      className={cn("fixed inset-0 -z-10 overflow-hidden", className)}
      aria-hidden="true"
      {...props}
    >
      {/* Background base color */}
      <div className="absolute inset-0 bg-bg-deep" />

      {/* Layer 1: Animated gradient nebula */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 80% 60% at 20% 40%, oklch(0.15 0.08 265 / 0.6), transparent)",
            "radial-gradient(ellipse 60% 80% at 80% 20%, oklch(0.12 0.06 330 / 0.5), transparent)",
            variant === "default"
              ? "radial-gradient(ellipse 70% 50% at 50% 80%, oklch(0.1 0.05 195 / 0.4), transparent)"
              : "",
          ]
            .filter(Boolean)
            .join(", "),
          animation: "nebulaShift 30s ease-in-out infinite alternate",
        }}
      />

      {/* Layer 2: Dot grid pattern */}
      <div
        className={cn(
          "absolute inset-0",
          variant === "subtle" ? "opacity-[0.03]" : "opacity-[0.06]",
        )}
        style={{
          backgroundImage:
            "radial-gradient(circle at center, oklch(0.96 0.01 280) 0.5px, transparent 0.5px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Layer 3: SVG noise overlay */}
      <svg
        role="img"
        aria-hidden="true"
        className={cn(
          "absolute inset-0 h-full w-full",
          variant === "subtle" ? "opacity-[0.015]" : "opacity-[0.03]",
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
        @keyframes nebulaShift {
          0% {
            transform: scale(1) translate(0, 0);
          }
          33% {
            transform: scale(1.05) translate(-2%, 1%);
          }
          66% {
            transform: scale(0.98) translate(1%, -1%);
          }
          100% {
            transform: scale(1.02) translate(-1%, 2%);
          }
        }
      `}</style>
    </div>
  );
}
AnimatedBackground.displayName = "AnimatedBackground";

export { AnimatedBackground };
export type { AnimatedBackgroundProps };
