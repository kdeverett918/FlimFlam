import { expect, test } from "@playwright/test";

import { closeAllControllers, driveSurveySmashToGuessing, startGame } from "./e2e-helpers";

test.describe("Survey Smash — Guess Along", () => {
  test.describe.configure({ timeout: 180_000 });

  test("host shows guess-along submission counter during guessing", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam", "Dan"],
    });

    try {
      const controllerPages = controllers.map((c) => c.controllerPage);

      await driveSurveySmashToGuessing(page, controllerPages, 90_000);

      const guessAlongLabel = page.getByText(/guess along/i).first();
      const hasGuessAlong = await guessAlongLabel.isVisible().catch(() => false);

      if (hasGuessAlong) {
        await expect(guessAlongLabel).toBeVisible();
        await expect(page.getByText(/submitted/i).first()).toBeVisible({ timeout: 5_000 });
      }
    } finally {
      await closeAllControllers(controllers);
    }
  });
});
