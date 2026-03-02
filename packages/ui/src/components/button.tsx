"use client";

import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-body font-semibold",
    "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-dark",
    "disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-white rounded-xl",
          "shadow-lg shadow-primary/25",
          "hover:brightness-110 hover:shadow-xl hover:shadow-primary/30",
          "hover:-translate-y-0.5 hover:shadow-[0_0_20px_oklch(0.72_0.22_25_/_0.35)]",
          "active:translate-y-0 active:scale-[0.97]",
          "overflow-hidden relative group",
        ].join(" "),
        secondary: [
          "bg-white/[0.10] backdrop-blur-md border border-white/[0.15] text-text-primary rounded-xl",
          "hover:bg-white/[0.14] hover:border-white/[0.22]",
          "hover:-translate-y-0.5",
          "active:translate-y-0 active:scale-[0.97]",
        ].join(" "),
        outline: [
          "border-2 border-primary/60 text-primary bg-transparent rounded-xl backdrop-blur-sm",
          "hover:bg-primary/10 hover:border-primary",
          "hover:-translate-y-0.5 hover:shadow-[0_0_16px_oklch(0.72_0.22_25_/_0.2)]",
          "active:translate-y-0 active:scale-[0.97]",
        ].join(" "),
        ghost: [
          "bg-transparent text-text-primary rounded-xl",
          "hover:bg-white/[0.10]",
          "active:scale-[0.97]",
        ].join(" "),
        destructive: [
          "bg-destructive text-white rounded-xl",
          "shadow-lg shadow-destructive/25",
          "hover:brightness-110 hover:shadow-xl hover:shadow-destructive/30",
          "hover:-translate-y-0.5",
          "active:translate-y-0 active:scale-[0.97]",
        ].join(" "),
        link: "text-primary underline-offset-4 hover:underline bg-transparent",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-lg",
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
          <>
            {children}
            {/* Shimmer effect for default variant */}
            {variant === "default" || variant === undefined ? (
              <span
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full"
                aria-hidden="true"
              />
            ) : null}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
