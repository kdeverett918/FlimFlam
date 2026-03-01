"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface MotionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Glow color on hover (defaults to coral) */
  glowColor?: string;
  /** Disable all hover effects */
  disableHover?: boolean;
}

const MotionCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  ({ className, glowColor, disableHover = false, style, children, ...props }, ref) => {
    const glow = glowColor ?? "oklch(0.72 0.22 25 / 0.15)";

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 text-text-primary",
          "backdrop-blur-xl backdrop-saturate-[1.2]",
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          !disableHover && [
            "hover:-translate-y-1 hover:border-white/[0.14]",
            "hover:shadow-xl",
          ],
          className,
        )}
        style={{
          ...(!disableHover
            ? { "--motion-card-glow": glow } as React.CSSProperties
            : {}),
          ...style,
        }}
        {...props}
      >
        {children}

        {/* Hover glow overlay */}
        {!disableHover && (
          <div
            className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              boxShadow: `0 0 30px ${glow}, inset 0 0 30px ${glow}`,
            }}
            aria-hidden="true"
          />
        )}
      </div>
    );
  },
);
MotionCard.displayName = "MotionCard";

export { MotionCard };
