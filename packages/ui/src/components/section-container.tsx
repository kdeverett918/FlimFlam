import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "../lib/utils";

const sectionContainerVariants = cva("relative w-full", {
  variants: {
    size: {
      sm: "max-w-xl mx-auto px-4",
      md: "max-w-3xl mx-auto px-6",
      lg: "max-w-5xl mx-auto px-8",
      full: "px-6",
    },
    padding: {
      none: "",
      sm: "py-6",
      md: "py-10",
      lg: "py-16",
    },
  },
  defaultVariants: {
    size: "md",
    padding: "md",
  },
});

export interface SectionContainerProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionContainerVariants> {
  /** Render as a different element (div, section, main, etc.) */
  as?: React.ElementType;
}

const SectionContainer = React.forwardRef<HTMLElement, SectionContainerProps>(
  ({ as: Component = "section", size, padding, className, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(sectionContainerVariants({ size, padding }), className)}
        {...props}
      />
    );
  },
);
SectionContainer.displayName = "SectionContainer";

export { SectionContainer, sectionContainerVariants };
