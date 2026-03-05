import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*/vitest.config.ts", "games/*/vitest.config.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "packages/ai/src/**/*.ts",
        "packages/game-engine/src/**/*.ts",
        "packages/shared/src/commentary.ts",
        "packages/shared/src/constants.ts",
        "packages/shared/src/index.ts",
        "packages/shared/src/utils/**/*.ts",
      ],
      exclude: ["**/*.test.ts", "**/__tests__/**", "packages/game-engine/src/GamePlugin.ts"],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
});
