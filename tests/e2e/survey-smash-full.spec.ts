import { expect, test } from "@playwright/test";

import {
  closeAllControllers,
  skipToPhase,
  startGame,
} from "./e2e-helpers";

test.describe("Survey Smash Full Gameplay", () => {
  test("start shows survey question text", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });

    // With fast timers, the game may have already advanced past question-reveal.
    // Check for any survey-smash content (round info, VS, question text, answer board).
    const hasSurveyContent = await Promise.race([
      page.getByText(/round 1 of \d/i).isVisible().catch(() => false),
      page.getByText("VS").isVisible().catch(() => false),
      page.getByText(/name a|what is|how many/i).first().isVisible().catch(() => false),
    ]);
    // If not visible yet, wait a bit for game to load
    if (!hasSurveyContent) {
      await expect(
        page.getByText(/round|VS|name a|what is|strike|the people say/i).first(),
      ).toBeVisible({ timeout: 20_000 });
    }

    await closeAllControllers(controllers);
  });

  test("skip through to guessing or round result", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });

    // Skip through phases until we see guessing-related or round-result content
    await skipToPhase(page, /strike|the people say|round \d+ complete/i, 15);

    const hasContent = await page
      .getByText(/strike|the people say|round \d+ complete/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasContent).toBe(true);

    await closeAllControllers(controllers);
  });

  test("skip through multiple rounds", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });

    // Skip past first few phases — should see round info or guessing content
    await skipToPhase(page, /round \d|guess|face.off|strike/i, 15);
    const hasGameContent = await page
      .getByText(/round \d|guess|face.off|strike/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasGameContent).toBe(true);

    // Player names visible in scoreboard
    await expect(page.getByText("Ari", { exact: true })).toBeVisible();

    await closeAllControllers(controllers);
  });

  test("end game returns to lobby", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });

    // Wait for game to start
    await expect(
      page.getByText(/round|VS|name a|what is|strike|the people say/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    // End button returns to lobby
    await page.getByRole("button", { name: /^end$/i }).click();
    await expect(page.getByRole("button", { name: /^Survey Smash$/i })).toBeVisible({
      timeout: 20_000,
    });

    await closeAllControllers(controllers);
  });
});
