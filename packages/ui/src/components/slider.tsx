import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";
import { cn } from "../lib/utils";

export interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  gradient?: boolean;
}

const Slider = React.forwardRef<React.ComponentRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, gradient = false, ...props }, ref) => (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-bg-elevated">
        <SliderPrimitive.Range
          className={cn(
            "absolute h-full rounded-full",
            gradient ? "bg-gradient-to-r from-accent-1 via-accent-3 to-accent-2" : "bg-accent-1",
          )}
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-12 w-12 rounded-full border-4 border-accent-1 bg-bg-card shadow-lg shadow-accent-1/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-dark disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing active:scale-110" />
    </SliderPrimitive.Root>
  ),
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
