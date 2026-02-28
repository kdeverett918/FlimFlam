import * as React from "react";
import { cn } from "../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  maxCharacters?: number;
  currentLength?: number;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, maxCharacters, currentLength, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <input
          type={type}
          className={cn(
            "flex h-14 w-full rounded-lg border bg-bg-card px-4 py-2 text-lg text-text-primary placeholder:text-text-muted font-body transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-dark disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-destructive focus-visible:ring-destructive"
              : "border-border focus-visible:ring-ring",
            className,
          )}
          ref={ref}
          {...props}
        />
        {maxCharacters !== undefined && (
          <span
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
