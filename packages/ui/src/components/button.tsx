import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-body font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-dark disabled:pointer-events-none disabled:opacity-50 active:scale-95 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-accent-1 text-white hover:brightness-110 shadow-lg shadow-accent-1/25",
        secondary: "bg-bg-card text-text-primary hover:bg-bg-elevated border border-border",
        outline: "border-2 border-accent-1 text-accent-1 bg-transparent hover:bg-accent-1/10",
        ghost: "bg-transparent text-text-primary hover:bg-bg-elevated",
        destructive:
          "bg-destructive text-white hover:brightness-110 shadow-lg shadow-destructive/25",
        link: "text-accent-2 underline-offset-4 hover:underline bg-transparent",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-md",
        default: "h-12 px-6 text-lg",
        lg: "h-14 px-8 text-xl",
        xl: "h-16 px-10 text-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
