import { expect, test } from "@playwright/test";

import { closeAllControllers, startGame } from "./e2e-helpers";

test.describe("Complexity Modes — Kids Round Count", () => {
  test("kids Brain Board shows round 1/3 counter", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    // The phase transition overlay should show "Round 1/3" for kids mode
    await expect
      .poll(
        async () => {
          const roundBadge = page.getByText(/round 1\/3/i).first();
          return roundBadge.isVisible().catch(() => false);
        },
        { timeout: 20_000 },
      )
      .toBe(true);

    await closeAllControllers(controllers);
  });

  test("kids Lucky Letters has 3 rounds", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });

    // Phase transition or host should display round 1/3
    await expect
      .poll(
        async () => {
          // Check host for /3 indicator
          const hostRound = page.getByText(/\b1\s*\/\s*3\b/i).first();
          if (await hostRound.isVisible().catch(() => false)) return true;

          // Also check controllers
          for (const controller of controllers) {
            const controllerRound = controller.controllerPage.getByText(/\b1\s*\/\s*3\b/i).first();
            if (await controllerRound.isVisible().catch(() => false)) return true;
          }
          return false;
        },
        { timeout: 20_000 },
      )
      .toBe(true);

    await closeAllControllers(controllers);
  });

  test("kids Survey Smash has 3 rounds", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });

    // Phase transition or round indicator should show /3
    await expect
      .poll(
        async () => {
          const hostRound = page.getByText(/round\s+1\s*\/\s*3\b/i).first();
          if (await hostRound.isVisible().catch(() => false)) return true;

          const roundBadge = page.getByText(/\b1\s*\/\s*3\b/i).first();
          return roundBadge.isVisible().catch(() => false);
        },
        { timeout: 20_000 },
      )
      .toBe(true);

    await closeAllControllers(controllers);
  });
});
