"use client";

import * as React from "react";

type GameTheme = "default" | "brain-board" | "lucky-letters" | "survey-smash";

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
  "brain-board": {
    accent: "var(--color-accent-brainboard)",
    glow: "oklch(0.68 0.22 265 / 0.3)",
    primaryBlob: "oklch(0.68 0.22 265)",
    secondaryBlob: "oklch(0.55 0.20 280)",
  },
  "lucky-letters": {
    accent: "var(--color-accent-luckyletters)",
    glow: "oklch(0.78 0.20 85 / 0.3)",
    primaryBlob: "oklch(0.78 0.20 85)",
    secondaryBlob: "oklch(0.70 0.18 60)",
  },
  "survey-smash": {
    accent: "var(--color-accent-surveysmash)",
    glow: "oklch(0.68 0.25 25 / 0.3)",
    primaryBlob: "oklch(0.68 0.25 25)",
    secondaryBlob: "oklch(0.72 0.22 40)",
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
  const themeConfig = GAME_THEMES[theme] ?? GAME_THEMES.default;

  const value = React.useMemo<GameThemeContextValue>(
    () => ({
      theme,
      accentColor: themeConfig.accent,
      glowColor: themeConfig.glow,
      setTheme: setTheme as (theme: GameTheme) => void,
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
