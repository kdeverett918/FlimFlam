// Utils
export { cn } from "./lib/utils";
export { haptics } from "./lib/haptics";

// Components
export { Button, buttonVariants } from "./components/button";
export type { ButtonProps } from "./components/button";

export { Input } from "./components/input";
export type { InputProps } from "./components/input";

export {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "./components/card";
export type { CardProps } from "./components/card";

export { Badge, badgeVariants } from "./components/badge";
export type { BadgeProps } from "./components/badge";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/dialog";

export { Progress } from "./components/progress";
export type { ProgressProps } from "./components/progress";

export { Slider } from "./components/slider";
export type { SliderProps } from "./components/slider";

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from "./components/avatar";
export type { AvatarProps } from "./components/avatar";

export { ScoreDisplay } from "./components/score-display";
export type { ScoreDisplayProps } from "./components/score-display";

// FlimFlam design system components
export { AnimatedBackground } from "./components/animated-background";
export type { AnimatedBackgroundProps } from "./components/animated-background";

export { GlassPanel, glassPanelVariants } from "./components/glass-panel";
export type { GlassPanelProps } from "./components/glass-panel";

export { ConfettiBurst } from "./components/confetti-burst";
export type { ConfettiBurstProps } from "./components/confetti-burst";

export { ScoreReveal } from "./components/score-reveal";
export type { ScoreRevealProps } from "./components/score-reveal";

export { GameThemeProvider, useGameTheme, GAME_THEMES } from "./components/game-theme-provider";
export type {
  GameTheme,
  GameThemeContextValue,
  GameThemeProviderProps,
} from "./components/game-theme-provider";

export { GradientText } from "./components/gradient-text";
export type { GradientTextProps } from "./components/gradient-text";

export { NoiseOverlay } from "./components/noise-overlay";
export type { NoiseOverlayProps } from "./components/noise-overlay";

export { SectionContainer, sectionContainerVariants } from "./components/section-container";
export type { SectionContainerProps } from "./components/section-container";

export { MotionCard } from "./components/motion-card";
export type { MotionCardProps } from "./components/motion-card";

export { AnimatedCounter } from "./components/animated-counter";
export type { AnimatedCounterProps } from "./components/animated-counter";

// Audio
export { soundManager, sounds } from "./lib/audio";
export type { SoundCategory, SoundConfig } from "./lib/audio";

// Hooks
export { useReducedMotion } from "./hooks/useReducedMotion";
export { useAudio } from "./hooks/useAudio";
export type { UseAudioReturn } from "./hooks/useAudio";

// Styles path hint for consumers: import "@flimflam/ui/styles"
