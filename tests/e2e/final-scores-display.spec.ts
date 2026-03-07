import { expect, test } from "@playwright/test";

import {
  closeAllControllers,
  driveBrainBoardToFinalScores,
  driveSurveySmashKidsToFinalScores,
  forceToFinalScores,
  startGame,
} from "./e2e-helpers";

test.describe("Final Scores Display", () => {
  test.describe.configure({ timeout: 180_000 });

  test("final scores shows ranking with all player names", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);

    await driveSurveySmashKidsToFinalScores(page, controllerPages);

    await expect(page.locator('[data-testid="final-scores-root"]').first()).toBeVisible();
    await expect(
      page.locator('[data-testid="final-score-row"][data-player-name="Ari"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="final-score-row"][data-player-name="Bea"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="final-score-row"][data-player-name="Cam"]').first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /play again/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /new game/i })).toBeVisible();

    await closeAllControllers(controllers);
  });

  for (const game of [
    { name: "Survey Smash", players: ["Ari", "Bea", "Cam"] as const },
    { name: "Brain Board", players: ["Alpha", "Beta"] as const },
    { name: "Lucky Letters", players: ["Ada", "Ben"] as const },
  ]) {
    test(`${game.name} final scores shows host action buttons`, async ({ page, browser }) => {
      const { controllers } = await startGame(page, browser, {
        game: game.name,
        complexity: "kids",
        playerNames: [...game.players],
      });
      const controllerPages = controllers.map((c) => c.controllerPage);

      if (game.name === "Survey Smash") {
        await driveSurveySmashKidsToFinalScores(page, controllerPages);
      } else if (game.name === "Brain Board") {
        await driveBrainBoardToFinalScores(page, controllerPages);
      } else {
        await forceToFinalScores(page);
      }

      await expect(page.locator('[data-testid="final-scores-root"]').first()).toBeVisible();
      await expect(page.getByRole("button", { name: /play again/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /new game/i })).toBeVisible();

      await closeAllControllers(controllers);
    });
  }

  test("controller shows game-over card with rank and score", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);

    await driveSurveySmashKidsToFinalScores(page, controllerPages);

    const firstController = controllers[0]?.controllerPage;
    if (!firstController) {
      throw new Error("Expected at least one controller");
    }

    await expect(firstController.getByText(/\d+(st|nd|rd|th)/i)).toBeVisible({ timeout: 20_000 });
    await expect(firstController.getByText(/check the main screen for results/i)).toBeVisible();

    await closeAllControllers(controllers);
  });

  test("play again restarts the same game from final scores", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Ari", "Bea"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);

    await driveBrainBoardToFinalScores(page, controllerPages);
    await page.getByRole("button", { name: /play again/i }).click();

    await expect(page.locator('[data-testid="final-scores-root"]').first()).toHaveCount(0, {
      timeout: 20_000,
    });
    await expect(page.getByRole("button", { name: /^skip$/i })).toBeVisible({ timeout: 20_000 });

    await closeAllControllers(controllers);
  });
});
