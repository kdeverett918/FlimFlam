import { expect, test } from "@playwright/test";

import {
  closeAllControllers,
  driveBrainBoardToFinalScores,
  driveSurveySmashKidsToFinalScores,
  forceToFinalScores,
  startGame,
} from "./e2e-helpers";

test.describe("Final Scores Awards and Scoreboard", () => {
  test.describe.configure({ timeout: 180_000 });

  test("final scores shows scoreboard with ranked entries for all players", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta", "Gamma"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);

    await driveBrainBoardToFinalScores(page, controllerPages);

    // Verify the "Final Scores" heading appears
    await expect(page.getByRole("heading", { name: /final scores/i }).first()).toBeVisible();

    // Verify all player names appear on the scoreboard
    await expect(page.getByText("Alpha", { exact: true })).toBeVisible();
    await expect(page.getByText("Beta", { exact: true })).toBeVisible();
    await expect(page.getByText("Gamma", { exact: true })).toBeVisible();

    // Verify action buttons
    await expect(page.getByRole("button", { name: /play again/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /new game/i })).toBeVisible();

    // Verify crown emoji is shown for the winner presentation
    await expect(page.locator("text=\uD83D\uDC51")).toBeVisible({ timeout: 10_000 });

    await closeAllControllers(controllers);
  });

  test("survey smash final scores show all expected visual elements", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);

    await driveSurveySmashKidsToFinalScores(page, controllerPages);

    await expect(page.getByRole("heading", { name: /final scores/i }).first()).toBeVisible();

    // Scoreboard should list all players
    await expect(page.getByText("Ari", { exact: true })).toBeVisible();
    await expect(page.getByText("Bea", { exact: true })).toBeVisible();
    await expect(page.getByText("Cam", { exact: true })).toBeVisible();

    // Crown emoji for winner
    await expect(page.locator("text=\uD83D\uDC51")).toBeVisible({ timeout: 10_000 });

    // Play Again and New Game buttons
    await expect(page.getByRole("button", { name: /play again/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /new game/i })).toBeVisible();

    await closeAllControllers(controllers);
  });

  test("lucky letters final scores shows winner crown and buttons", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });

    await forceToFinalScores(page);

    await expect(page.getByRole("heading", { name: /final scores/i }).first()).toBeVisible();
    await expect(page.getByText("Ada", { exact: true })).toBeVisible();
    await expect(page.getByText("Ben", { exact: true })).toBeVisible();
    await expect(page.locator("text=\uD83D\uDC51")).toBeVisible({ timeout: 10_000 });

    await closeAllControllers(controllers);
  });

  test("new game from final scores resets scores to zero", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Ari", "Bea"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);

    await driveBrainBoardToFinalScores(page, controllerPages);
    await expect(page.getByRole("heading", { name: /final scores/i }).first()).toBeVisible();

    // Click "New Game" to go back to lobby
    await page.getByRole("button", { name: /new game/i }).click();

    // Wait for lobby
    await expect(page.getByRole("heading", { name: /^select game$/i })).toBeVisible({
      timeout: 20_000,
    });

    // Start another game
    await page.getByRole("button", { name: /^Brain Board$/i }).click();
    await page.getByRole("button", { name: /^kids/i }).click();
    const startButton = page.getByRole("button", { name: /start game/i });
    await expect(startButton).toBeEnabled({ timeout: 30_000 });
    await startButton.click();

    // In the new game, skip to a leaderboard phase
    const skipButton = page.getByRole("button", { name: /^skip$/i });
    await expect(skipButton).toBeVisible({ timeout: 30_000 });
    await skipButton.click();

    // Leaderboard rows should all have score=0 at the start of a new game
    const leaderboardRows = page.locator('[data-testid="leaderboard-row"]');
    await expect(leaderboardRows.first()).toBeVisible({ timeout: 15_000 });
    const scores = await leaderboardRows.evaluateAll((rows) =>
      rows.map((row) => Number(row.getAttribute("data-score") ?? "NaN")),
    );
    for (const score of scores) {
      expect(score).toBe(0);
    }

    await closeAllControllers(controllers);
  });
});
