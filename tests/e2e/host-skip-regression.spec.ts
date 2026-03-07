import { expect, test } from "@playwright/test";

import {
  closeAllControllers,
  driveBrainBoardToFinalScores,
  driveSurveySmashToFinalScores,
  forceToFinalScores,
  startGame,
} from "./e2e-helpers";

/**
 * Regression tests: verify skip never softlocks for any game.
 * These drive each game from start to Final Scores using only
 * host skip + automated controller interactions.
 */

test.describe("Host Skip Regression — no softlocks", () => {
  test("Brain Board: skip to final scores without softlock", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Rex", "Rio"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);

    await driveBrainBoardToFinalScores(page, controllerPages);

    await expect(page.locator('[data-testid="final-scores-root"]').first()).toBeVisible();
    await expect(
      page.locator('[data-testid="final-score-row"][data-player-name="Rex"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="final-score-row"][data-player-name="Rio"]').first(),
    ).toBeVisible();

    await closeAllControllers(controllers);
  });

  test("Lucky Letters: skip to final scores without softlock", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Lux", "Lea"],
    });

    await forceToFinalScores(page, 300);

    await expect(page.locator('[data-testid="final-scores-root"]').first()).toBeVisible();
    await expect(
      page.locator('[data-testid="final-score-row"][data-player-name="Lux"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="final-score-row"][data-player-name="Lea"]').first(),
    ).toBeVisible();

    await closeAllControllers(controllers);
  });

  test("Survey Smash: skip to final scores without softlock", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Sam", "Sid", "Sue"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);

    await driveSurveySmashToFinalScores(page, controllerPages);

    await expect(page.locator('[data-testid="final-scores-root"]').first()).toBeVisible();
    await expect(
      page.locator('[data-testid="final-score-row"][data-player-name="Sam"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="final-score-row"][data-player-name="Sid"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="final-score-row"][data-player-name="Sue"]').first(),
    ).toBeVisible();

    await closeAllControllers(controllers);
  });
});
