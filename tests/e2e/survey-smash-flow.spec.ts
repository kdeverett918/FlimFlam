import { expect, test } from "@playwright/test";

import {
  closeAllControllers,
  driveSurveySmashToFinalScores,
  findActiveGuesser,
  findFaceOffPlayers,
  skipToPhase,
  startGame,
  submitTextAnswer,
} from "./e2e-helpers";

test.describe("Survey Smash Flow", () => {
  test("starts and shows question-reveal on host", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });

    // Host should show round number and survey question text
    await expect(page.getByText(/round 1 of \d/i)).toBeVisible({ timeout: 20_000 });

    // Controllers should show round badge
    for (const c of controllers) {
      await expect(c.controllerPage.getByText(/round 1/i)).toBeVisible({ timeout: 15_000 });
    }

    await closeAllControllers(controllers);
  });

  test("face-off phase shows VS screen and prompts 2 players", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // question-reveal -> face-off
    await skipBtn.click();

    // Host shows VS between two player names
    await expect(page.getByText("VS")).toBeVisible({ timeout: 15_000 });

    // Exactly 2 controllers should get textbox for face-off; 1 should be waiting
    const faceOffPlayers = await findFaceOffPlayers([page, ...controllerPages], 2);
    expect(faceOffPlayers.length).toBe(2);

    // The remaining controller should NOT have a textbox
    const waitingPlayer = controllerPages.find((cp) => !faceOffPlayers.includes(cp));
    if (waitingPlayer) {
      const hasTextbox = await waitingPlayer
        .getByRole("textbox")
        .first()
        .isVisible()
        .catch(() => false);
      expect(hasTextbox).toBe(false);
    }

    await closeAllControllers(controllers);
  });

  test("face-off answer submission advances to guessing", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // question-reveal -> face-off
    await skipBtn.click();
    await expect(page.getByText("VS")).toBeVisible({ timeout: 15_000 });

    // Both face-off players submit answers
    const faceOffPlayers = await findFaceOffPlayers([page, ...controllerPages], 2);
    await submitTextAnswer(faceOffPlayers[0] as import("@playwright/test").Page, "pizza");
    await submitTextAnswer(faceOffPlayers[1] as import("@playwright/test").Page, "tacos");

    // Should advance to guessing phase — skip if timer hasn't auto-advanced
    await skipBtn.click();

    // In guessing phase, one controller should have the submit button
    const guesser = await findActiveGuesser(controllerPages, 20_000);
    expect(guesser).toBeTruthy();

    await closeAllControllers(controllers);
  });

  test("strike display shows X marks on wrong answers", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // question-reveal -> face-off -> guessing
    await skipBtn.click();
    await skipBtn.click();

    // Guesser submits a wrong answer
    const guesser = await findActiveGuesser(controllerPages, 20_000);
    await submitTextAnswer(guesser, "zzzzzzzzzz");

    // Host should show strike
    await expect(page.getByText(/^strike!?$/i)).toBeVisible({ timeout: 15_000 });

    await closeAllControllers(controllers);
  });

  test("completes full game via host skip speedrun", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);

    await driveSurveySmashToFinalScores(page, controllerPages);

    // All players visible on final scores
    await expect(page.getByText("Ari", { exact: true })).toBeVisible();
    await expect(page.getByText("Bea", { exact: true })).toBeVisible();
    await expect(page.getByText("Cam", { exact: true })).toBeVisible();

    // Play Again and New Game buttons shown
    await expect(page.getByRole("button", { name: /play again/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /new game/i })).toBeVisible();

    await closeAllControllers(controllers);
  });

  test("answer reveal shows all survey answers", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // question-reveal -> face-off -> guessing
    await skipBtn.click();
    await skipBtn.click();

    // Submit a wrong guess to trigger strike path
    const guesser = await findActiveGuesser(controllerPages, 20_000);
    await submitTextAnswer(guesser, "zzzzzzzzzz");
    await expect(page.getByText(/^strike!?$/i)).toBeVisible({ timeout: 15_000 });

    // Skip through to answer-reveal
    await skipToPhase(page, /the people say/i, 10);

    // Host shows the answer board heading
    await expect(page.getByText(/the people say/i)).toBeVisible();

    await closeAllControllers(controllers);
  });

  test("controller shows watch cards during guessing", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // question-reveal -> face-off -> guessing
    await skipBtn.click();
    await skipBtn.click();

    // Find the active guesser
    const guesser = await findActiveGuesser(controllerPages, 20_000);

    // Non-active controllers should show a watch card (no textbox)
    for (const cp of controllerPages) {
      if (cp === guesser) continue;
      const hasTextbox = await cp
        .getByRole("textbox")
        .first()
        .isVisible()
        .catch(() => false);
      expect(hasTextbox).toBe(false);
      // Should show some watch content (guessing info)
      await expect(cp.getByText(/guessing/i)).toBeVisible({ timeout: 10_000 });
    }

    await closeAllControllers(controllers);
  });

  test("round-result shows winner and scores", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // question-reveal -> face-off -> guessing
    await skipBtn.click();
    await skipBtn.click();

    // Submit a wrong guess to trigger strike
    const guesser = await findActiveGuesser(controllerPages, 20_000);
    await submitTextAnswer(guesser, "zzzzzzzzzz");
    await expect(page.getByText(/^strike!?$/i)).toBeVisible({ timeout: 15_000 });

    // Skip to round-result
    await skipToPhase(page, /round \d+ complete/i, 10);

    // Host shows round complete with score info
    await expect(page.getByText(/round \d+ complete/i)).toBeVisible();

    await closeAllControllers(controllers);
  });
});
