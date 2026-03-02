"use client";

import * as React from "react";

type GameTheme =
  | "default"
  | "world-builder"
  | "bluff-engine"
  | "quick-draw"
  | "reality-drift"
  | "hot-take"
  | "brain-battle";

interface GameThemeContextValue {
  theme: GameTheme;
  accentColor: string;
  glowColor: string;
  setTheme: (theme: GameTheme) => void;
}

const GAME_THEMES: Record<
  GameTheme,
  { accent: string; glow: string; primaryBlob: string; secondaryBlob: string }
> = {
  default: {
    accent: "var(--color-primary)",
    glow: "oklch(0.72 0.22 25 / 0.3)",
    primaryBlob: "oklch(0.72 0.22 25)",
    secondaryBlob: "oklch(0.70 0.15 185)",
  },
  "world-builder": {
    accent: "var(--color-accent-2)",
    glow: "oklch(0.68 0.2 300 / 0.3)",
    primaryBlob: "oklch(0.68 0.20 300)",
    secondaryBlob: "oklch(0.60 0.18 270)",
  },
  "bluff-engine": {
    accent: "var(--color-accent-3)",
    glow: "oklch(0.78 0.18 85 / 0.3)",
    primaryBlob: "oklch(0.78 0.18 85)",
    secondaryBlob: "oklch(0.70 0.16 60)",
  },
  "quick-draw": {
    accent: "var(--color-accent-4)",
    glow: "oklch(0.72 0.18 160 / 0.3)",
    primaryBlob: "oklch(0.72 0.18 160)",
    secondaryBlob: "oklch(0.65 0.15 140)",
  },
  "reality-drift": {
    accent: "var(--color-accent-5)",
    glow: "oklch(0.7 0.15 210 / 0.3)",
    primaryBlob: "oklch(0.70 0.15 210)",
    secondaryBlob: "oklch(0.62 0.14 240)",
  },
  "hot-take": {
    accent: "var(--color-accent-6)",
    glow: "oklch(0.68 0.25 20 / 0.3)",
    primaryBlob: "oklch(0.68 0.25 20)",
    secondaryBlob: "oklch(0.72 0.22 40)",
  },
  "brain-battle": {
    accent: "var(--color-accent-7)",
    glow: "oklch(0.65 0.22 260 / 0.3)",
    primaryBlob: "oklch(0.65 0.22 260)",
    secondaryBlob: "oklch(0.58 0.20 280)",
  },
};

const GameThemeContext = React.createContext<GameThemeContextValue>({
  theme: "default",
  accentColor: GAME_THEMES.default.accent,
  glowColor: GAME_THEMES.default.glow,
  setTheme: () => {},
});

interface GameThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: GameTheme;
  className?: string;
}

function GameThemeProvider({
  children,
  defaultTheme = "default",
  className,
}: GameThemeProviderProps) {
  const [theme, setTheme] = React.useState<GameTheme>(defaultTheme);
  const themeConfig = GAME_THEMES[theme];

  const value = React.useMemo<GameThemeContextValue>(
    () => ({
      theme,
      accentColor: themeConfig.accent,
      glowColor: themeConfig.glow,
      setTheme,
    }),
    [theme, themeConfig],
  );

  return (
    <GameThemeContext.Provider value={value}>
      <div
        className={className}
        style={
          {
            "--game-accent": themeConfig.accent,
            "--game-glow": themeConfig.glow,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </GameThemeContext.Provider>
  );
}
GameThemeProvider.displayName = "GameThemeProvider";

function useGameTheme(): GameThemeContextValue {
  return React.useContext(GameThemeContext);
}

export { GameThemeProvider, useGameTheme, GAME_THEMES };
export type { GameTheme, GameThemeContextValue, GameThemeProviderProps };
