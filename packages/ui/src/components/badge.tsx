import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold font-body transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/20 text-primary backdrop-blur-sm",
        secondary: "border-white/[0.08] bg-white/[0.04] text-text-primary backdrop-blur-sm",
        destructive: "border-transparent bg-destructive/20 text-destructive",
        outline: "border-white/[0.12] text-text-primary bg-transparent backdrop-blur-sm",
        success: "border-transparent bg-success/20 text-success",
        gradient:
          "border-transparent bg-gradient-to-r from-primary/20 to-secondary/20 text-text-primary backdrop-blur-sm",
        ai: "border-primary/40 bg-primary/10 text-primary shadow-[0_0_12px_oklch(0.72_0.22_25_/_0.25)] motion-safe:animate-pulse backdrop-blur-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
