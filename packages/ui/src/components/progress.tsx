import * as ProgressPrimitive from "@radix-ui/react-progress";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "../lib/utils";

const progressIndicatorVariants = cva(
  "h-full w-full flex-1 rounded-full transition-all duration-500 ease-in-out",
  {
    variants: {
      color: {
        default: "bg-accent-1",
        green: "bg-success",
        yellow: "bg-accent-3",
        red: "bg-destructive",
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
    IndicatorVariants {}

const Progress = React.forwardRef<React.ComponentRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, value, color, ...props }, ref) => (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-bg-elevated", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(progressIndicatorVariants({ color }))}
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  ),
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
