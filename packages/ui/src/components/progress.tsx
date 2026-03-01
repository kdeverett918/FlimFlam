"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "../lib/utils";

const progressIndicatorVariants = cva(
  "h-full w-full flex-1 rounded-full transition-all duration-500 ease-in-out",
  {
    variants: {
      color: {
        default:
          "bg-gradient-to-r from-primary to-secondary shadow-[0_0_10px_oklch(0.72_0.22_25_/_0.4)]",
        green: "bg-success shadow-[0_0_8px_oklch(0.65_0.2_145_/_0.4)]",
        yellow: "bg-accent-3 shadow-[0_0_8px_oklch(0.75_0.18_85_/_0.4)]",
        red: "bg-destructive shadow-[0_0_8px_oklch(0.55_0.22_25_/_0.4)]",
      },
    },
    defaultVariants: {
      color: "default",
    },
  },
);

type IndicatorVariants = VariantProps<typeof progressIndicatorVariants>;

export interface ProgressProps
  extends Omit<React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>, "color">,
    IndicatorVariants {
  /** Pulse the bar when value reaches 100 */
  pulseOnComplete?: boolean;
}

const Progress = React.forwardRef<React.ComponentRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, value, color, pulseOnComplete = false, ...props }, ref) => {
    const clamped = Math.min(100, Math.max(0, value ?? 0));
    const isComplete = clamped >= 100;

    return (
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-white/[0.06] backdrop-blur-sm",
          className,
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            progressIndicatorVariants({ color }),
            pulseOnComplete && isComplete && "animate-pulse",
          )}
          style={{ transform: `translateX(-${100 - clamped}%)` }}
        />
      </ProgressPrimitive.Root>
    );
  },
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
