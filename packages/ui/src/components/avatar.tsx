import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "../lib/utils";

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full ring-2 ring-white/[0.08]",
  {
    variants: {
      size: {
        sm: "h-8 w-8 text-xs",
        md: "h-12 w-12 text-base",
        lg: "h-16 w-16 text-xl",
        xl: "h-24 w-24 text-3xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  color?: string;
  /** Show animated coral ring around the avatar */
  ringActive?: boolean;
  /** Status indicator: online, away, or offline */
  status?: "online" | "away" | "offline";
}

const Avatar = React.forwardRef<React.ComponentRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  ({ className, size, color, ringActive, status, style, ...props }, ref) => (
    <div className="relative inline-flex">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          avatarVariants({ size, className }),
          ringActive && "ring-primary ring-[3px] ring-offset-2 ring-offset-bg-deep",
        )}
        style={{
          backgroundColor: color,
          ...(ringActive ? { animation: "avatarRingPulse 2s ease-in-out infinite" } : {}),
          ...style,
        }}
        {...props}
      />
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full border-2 border-bg-deep",
            size === "sm" && "h-2.5 w-2.5",
            size === "md" && "h-3 w-3",
            size === "lg" && "h-3.5 w-3.5",
            size === "xl" && "h-4 w-4",
            !size && "h-3 w-3",
            status === "online" && "bg-success",
            status === "away" && "bg-warning",
            status === "offline" && "bg-text-dim",
          )}
        >
          <span className="sr-only">{status}</span>
        </span>
      )}
      <style>{`
        @keyframes avatarRingPulse {
          0%, 100% { box-shadow: 0 0 0 0 oklch(0.72 0.22 25 / 0.4); }
          50% { box-shadow: 0 0 0 4px oklch(0.72 0.22 25 / 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes avatarRingPulse { 0%, 100% { box-shadow: none; } }
        }
      `}</style>
    </div>
  ),
);
Avatar.displayName = AvatarPrimitive.Root.displayName;

/** Wrapper for stacking avatars in a group with overlapping layout */
function AvatarGroup({
  children,
  max,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { max?: number }) {
  const childArray = React.Children.toArray(children);
  const visible = max ? childArray.slice(0, max) : childArray;
  const overflow = max ? childArray.length - max : 0;

  return (
    <div className={cn("flex items-center -space-x-3", className)} {...props}>
      {visible}
      {overflow > 0 && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-surface ring-2 ring-bg-deep text-sm font-bold text-text-muted">
          +{overflow}
        </div>
      )}
    </div>
  );
}
AvatarGroup.displayName = "AvatarGroup";

const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-bg-surface font-display font-bold text-text-primary",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup };
