import * as React from "react";
import { cn } from "../lib/utils";

export interface GradientTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** CSS direction for the gradient (e.g. "to right", "135deg") */
  direction?: string;
  /** Start color — defaults to electric coral */
  from?: string;
  /** End color — defaults to deep teal */
  to?: string;
  /** Render as a different element (h1, h2, p, etc.) */
  as?: React.ElementType;
  /** Animate the gradient position */
  animated?: boolean;
}

const GradientText = React.forwardRef<HTMLSpanElement, GradientTextProps>(
  (
    {
      direction = "to right",
      from = "oklch(0.72 0.22 25)",
      to = "oklch(0.70 0.15 185)",
      as: Component = "span",
      animated = false,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    return (
      <Component
        ref={ref}
        className={cn(
          "bg-clip-text text-transparent",
          animated && "animate-[gradientShift_4s_ease-in-out_infinite]",
          className,
        )}
        style={{
          backgroundImage: animated
            ? `linear-gradient(${direction}, ${from}, ${to}, ${from})`
            : `linear-gradient(${direction}, ${from}, ${to})`,
          backgroundSize: animated ? "200% 100%" : undefined,
          ...style,
        }}
        {...props}
      />
    );
  },
);
GradientText.displayName = "GradientText";

export { GradientText };
