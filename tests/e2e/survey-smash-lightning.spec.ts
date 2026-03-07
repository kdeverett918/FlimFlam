import { expect, test } from "@playwright/test";

import {
  answerSurveySmashLightningQuestion,
  closeAllControllers,
  driveSurveySmashToFinalScores,
  driveSurveySmashToLightningRound,
  startGame,
} from "./e2e-helpers";

test.describe("Survey Smash Lightning Round", () => {
  // Standard mode drives through 4 rounds before lightning — needs extra time
  test.describe.configure({ timeout: 180_000 });

  test("standard mode includes lightning round", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "standard",
      playerNames: ["Leo", "Ivy", "Max"],
    });
    try {
      const controllerPages = controllers.map((c) => c.controllerPage);

      // Drive through regular rounds to reach lightning (needs player input)
      await driveSurveySmashToLightningRound(page, controllerPages);

      await expect(page.getByText(/lightning round/i).first()).toBeVisible();
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("lightning round accepts quick guess answers", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "standard",
      playerNames: ["Leo", "Ivy", "Max"],
    });
    try {
      const controllerPages = controllers.map((c) => c.controllerPage);
      const lightningResults = page.getByText(/lightning round results/i).first();

      await answerSurveySmashLightningQuestion(page, controllerPages, "guess-1");

      // The round should still resolve into shared results after the quick guess.
      await expect(lightningResults).toBeVisible({
        timeout: 45_000,
      });
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("lightning reveal shows answer breakdown", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "standard",
      playerNames: ["Leo", "Ivy", "Max"],
    });
    try {
      const controllerPages = controllers.map((c) => c.controllerPage);
      const lightningResults = page.getByText(/lightning round results/i).first();

      await answerSurveySmashLightningQuestion(page, controllerPages, "answer-1");

      // Lightning results should appear with per-answer breakdown
      await expect(lightningResults).toBeVisible({
        timeout: 45_000,
      });

      await expect(page.locator('[data-testid="survey-smash-lightning-result-row"]')).toHaveCount(
        5,
        { timeout: 10_000 },
      );
      await expect(page.locator('[data-testid="survey-smash-lightning-total"]').first()).toBeVisible(
        { timeout: 10_000 },
      );
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("kids mode skips lightning round", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Leo", "Ivy", "Max"],
    });
    try {
      const controllerPages = controllers.map((c) => c.controllerPage);

      // Drive to final scores (kids mode has no lightning)
      await driveSurveySmashToFinalScores(page, controllerPages);

      await expect(page.locator('[data-testid="final-scores-root"]').first()).toBeVisible();
    } finally {
      await closeAllControllers(controllers);
    }
  });
});
