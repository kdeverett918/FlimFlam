import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "../lib/utils";

const glassPanelVariants = cva("text-text-primary transition-all duration-200", {
  variants: {
    variant: {
      glass: "bg-white/[0.10] border border-white/[0.15] backdrop-blur-xl backdrop-saturate-[1.2]",
      solid: "bg-bg-elevated border border-border",
      outlined: "bg-transparent border-2 border-white/[0.20]",
      gradient:
        "border border-white/[0.15] backdrop-blur-xl backdrop-saturate-[1.2] bg-gradient-to-br from-primary/15 via-white/[0.06] to-secondary/15",
    },
    rounded: {
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
      "2xl": "rounded-2xl",
    },
    depth: {
      flat: "",
      shallow: "shadow-[inset_0_1px_0_oklch(1_0_0/0.08),0_1px_3px_oklch(0_0_0/0.2)]",
      deep: "shadow-[inset_0_1px_0_oklch(1_0_0/0.08),inset_0_-1px_2px_oklch(0_0_0/0.15),0_2px_8px_oklch(0_0_0/0.3)]",
    },
  },
  defaultVariants: {
    variant: "glass",
    rounded: "xl",
    depth: "flat",
  },
});

export interface GlassPanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassPanelVariants> {
  glow?: boolean;
  glowColor?: string;
  /** Optional accent border color (applied with low opacity) */
  accentColor?: string;
}

const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    { className, variant, rounded, depth, glow = false, glowColor, accentColor, style, ...props },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(glassPanelVariants({ variant, rounded, depth }), className)}
        style={{
          ...(glow
            ? {
                boxShadow: `0 0 24px ${glowColor ?? "oklch(0.72 0.22 25 / 0.3)"}`,
              }
            : {}),
          ...(accentColor
            ? {
                borderColor: accentColor.includes("/")
                  ? accentColor
                  : `${accentColor.replace(")", " / 0.25)")}`,
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

export { GlassPanel, glassPanelVariants };
