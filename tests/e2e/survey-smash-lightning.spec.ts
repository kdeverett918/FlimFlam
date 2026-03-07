import { expect, test } from "@playwright/test";

import {
  closeAllControllers,
  driveSurveySmashToFinalScores,
  driveSurveySmashToLightningQuestion,
  driveSurveySmashToLightningRound,
  findSurveySmashLightningActor,
  startGame,
  submitQuickGuess,
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

      // Drive through regular rounds to reach lightning
      let lightningController = await driveSurveySmashToLightningQuestion(page, controllerPages);

      // Lightning phase uses "Guess" button for the selected player
      for (let i = 0; i < 5; i++) {
        if (i > 0) {
          lightningController = await findSurveySmashLightningActor(
            [page, ...controllerPages],
            20_000,
          );
        }
        await submitQuickGuess(lightningController, `guess-${i + 1}`);
      }

      // After 5 guesses, should show lightning round results
      await expect(page.getByText(/lightning round results/i).first()).toBeVisible({
        timeout: 20_000,
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

      // Drive through regular rounds to reach lightning
      let lightningController = await driveSurveySmashToLightningQuestion(page, controllerPages);

      // Submit 5 quick guesses
      for (let i = 0; i < 5; i++) {
        if (i > 0) {
          lightningController = await findSurveySmashLightningActor(
            [page, ...controllerPages],
            20_000,
          );
        }
        await submitQuickGuess(lightningController, `answer-${i + 1}`);
      }

      // Lightning results should appear with per-answer breakdown
      await expect(page.getByText(/lightning round results/i).first()).toBeVisible({
        timeout: 20_000,
      });

      // Should show points total
      await expect(page.getByText(/points/i).first()).toBeVisible({ timeout: 10_000 });
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

      await expect(page.getByRole("heading", { name: /final scores/i }).first()).toBeVisible();
    } finally {
      await closeAllControllers(controllers);
    }
  });
});
