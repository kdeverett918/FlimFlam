import * as React from "react";
import { cn } from "../lib/utils";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  glowColor?: string;
  rounded?: "md" | "lg" | "xl" | "2xl";
}

const roundedMap = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
} as const;

const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, glow = false, glowColor, rounded = "xl", style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white/[0.06] border border-white/[0.08] text-text-primary",
          roundedMap[rounded],
          className,
        )}
        style={{
          backdropFilter: "blur(16px) saturate(1.2)",
          WebkitBackdropFilter: "blur(16px) saturate(1.2)",
          ...(glow
            ? {
                boxShadow: `0 0 24px ${glowColor ?? "var(--game-glow, oklch(0.7 0.18 265 / 0.3))"}`,
              }
            : {}),
          ...style,
        }}
        {...props}
      />
    );
  },
);
GlassPanel.displayName = "GlassPanel";

export { GlassPanel };
export type { GlassPanelProps };
