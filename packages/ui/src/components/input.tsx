import * as React from "react";
import { cn } from "../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  maxCharacters?: number;
  currentLength?: number;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, maxCharacters, currentLength, ...props }, ref) => {
    const counterId = React.useId();
    return (
      <div className="relative w-full">
        <input
          type={type}
          className={cn(
            "flex h-14 w-full rounded-xl border bg-white/[0.10] backdrop-blur-md px-4 py-2 text-lg text-text-primary placeholder:text-text-dim font-body transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-dark disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-destructive focus-visible:ring-destructive/40"
              : "border-white/[0.15] focus-visible:border-accent-1 focus-visible:ring-accent-1/30",
            maxCharacters !== undefined && "pr-16",
            className,
          )}
          ref={ref}
          aria-describedby={maxCharacters !== undefined ? counterId : undefined}
          {...props}
        />
        {maxCharacters !== undefined && (
          <span
            id={counterId}
            aria-live="polite"
            aria-atomic="true"
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-sm font-body",
              currentLength !== undefined && currentLength > maxCharacters
                ? "text-destructive"
                : "text-text-muted",
            )}
          >
            {currentLength ?? 0}/{maxCharacters}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
