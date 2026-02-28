import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold font-body transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-accent-1 text-white",
        secondary: "border-border bg-bg-card text-text-primary",
        destructive: "border-transparent bg-destructive text-white",
        outline: "border-border text-text-primary bg-transparent",
        success: "border-transparent bg-success text-white",
        ai: "border-accent-4/50 bg-accent-4/20 text-accent-4 shadow-[0_0_12px_rgba(123,97,255,0.3)] animate-pulse",
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
