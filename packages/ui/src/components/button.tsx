import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-body font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-dark disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-accent-1 text-white rounded-xl shadow-lg shadow-accent-1/25 hover:brightness-110 hover:shadow-xl hover:shadow-accent-1/30 hover:scale-[1.02] hover:-translate-y-px active:scale-[0.97]",
        secondary:
          "bg-white/[0.04] backdrop-blur-md border border-white/[0.08] text-text-primary rounded-xl hover:bg-white/[0.08] hover:border-white/[0.12] hover:scale-[1.02] hover:-translate-y-px active:scale-[0.97]",
        outline:
          "border-2 border-accent-1/60 text-accent-1 bg-transparent rounded-xl backdrop-blur-sm hover:bg-accent-1/10 hover:border-accent-1 hover:scale-[1.02] hover:-translate-y-px active:scale-[0.97]",
        ghost:
          "bg-transparent text-text-primary rounded-xl hover:bg-white/[0.06] active:scale-[0.97]",
        destructive:
          "bg-destructive text-white rounded-xl shadow-lg shadow-destructive/25 hover:brightness-110 hover:shadow-xl hover:shadow-destructive/30 hover:scale-[1.02] hover:-translate-y-px active:scale-[0.97]",
        link: "text-accent-1 underline-offset-4 hover:underline bg-transparent",
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
