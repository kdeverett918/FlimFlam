import { expect, test } from "@playwright/test";

import { closeAllControllers, startGame } from "./e2e-helpers";

test.describe("Complexity Modes", () => {
  test("standard Lucky Letters has 4 rounds", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "standard",
      playerNames: ["Ada", "Ben"],
    });

    // Phase can advance quickly; verify any controller shows a /4 round cap.
    await expect
      .poll(
        async () => {
          for (const controller of controllers) {
            const roundBadge = controller.controllerPage.getByText(/\b\d+\s*\/\s*4\b/i).first();
            if (await roundBadge.isVisible().catch(() => false)) return true;
          }
          return false;
        },
        { timeout: 20_000 },
      )
      .toBe(true);

    await closeAllControllers(controllers);
  });

  test("advanced Survey Smash has 5 rounds", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "advanced",
      playerNames: ["Ari", "Bea", "Cam"],
    });

    // Phase can advance quickly; verify host/controller surfaces a /5 round cap for advanced mode.
    await expect
      .poll(
        async () => {
          const hostRoundBadge = page.getByText(/\bround\s+\d+\s*\/\s*5\b/i).first();
          if (await hostRoundBadge.isVisible().catch(() => false)) return true;

          for (const controller of controllers) {
            const controllerRoundBadge = controller.controllerPage
              .getByText(/\b\d+\s*\/\s*5\b/i)
              .first();
            if (await controllerRoundBadge.isVisible().catch(() => false)) return true;
          }

          return false;
        },
        { timeout: 20_000 },
      )
      .toBe(true);

    await closeAllControllers(controllers);
  });

  test("standard Brain Board opens clue-select", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "standard",
      playerNames: ["Alpha", "Beta"],
    });
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // category-reveal -> clue-select
    await skipBtn.click();

    await expect(page.getByText("$200").first()).toBeVisible({ timeout: 20_000 });

    await closeAllControllers(controllers);
  });
});
