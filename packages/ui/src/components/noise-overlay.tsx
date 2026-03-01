import * as React from "react";
import { cn } from "../lib/utils";

export interface NoiseOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Opacity of the noise layer (default 0.04) */
  opacity?: number;
  /** Base frequency for SVG feTurbulence (default 0.65) */
  baseFrequency?: number;
}

function NoiseOverlay({
  opacity = 0.04,
  baseFrequency = 0.65,
  className,
  ...props
}: NoiseOverlayProps) {
  const filterId = React.useId();

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-50", className)}
      aria-hidden="true"
      style={{ contain: "strict" }}
      {...props}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-hidden="true"
        style={{ opacity }}
      >
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency={baseFrequency}
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
    </div>
  );
}
NoiseOverlay.displayName = "NoiseOverlay";

export { NoiseOverlay };
