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
}

const Avatar = React.forwardRef<React.ComponentRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  ({ className, size, color, style, ...props }, ref) => (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(avatarVariants({ size, className }))}
      style={{ backgroundColor: color, ...style }}
      {...props}
    />
  ),
);
Avatar.displayName = AvatarPrimitive.Root.displayName;

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

export { Avatar, AvatarImage, AvatarFallback };
