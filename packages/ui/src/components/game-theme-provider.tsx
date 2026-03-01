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

const GAME_THEMES: Record<GameTheme, { accent: string; glow: string }> = {
  default: {
    accent: "var(--color-accent-1)",
    glow: "oklch(0.7 0.18 265 / 0.3)",
  },
  "world-builder": {
    accent: "var(--color-accent-2)",
    glow: "oklch(0.7 0.2 330 / 0.3)",
  },
  "bluff-engine": {
    accent: "var(--color-accent-3)",
    glow: "oklch(0.75 0.18 85 / 0.3)",
  },
  "quick-draw": {
    accent: "var(--color-accent-4)",
    glow: "oklch(0.75 0.15 195 / 0.3)",
  },
  "reality-drift": {
    accent: "var(--color-accent-5)",
    glow: "oklch(0.7 0.2 145 / 0.3)",
  },
  "hot-take": {
    accent: "var(--color-accent-6)",
    glow: "oklch(0.65 0.25 25 / 0.3)",
  },
  "brain-battle": {
    accent: "var(--color-accent-7)",
    glow: "oklch(0.65 0.22 260 / 0.3)",
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
