import { expect, test } from "@playwright/test";

import { closeAllControllers, forceToFinalScores, skipToPhase, startGame } from "./e2e-helpers";

test.describe("Brain Board Full Gameplay", () => {
  test("start to category phase", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    // Host should show Brain Board heading on category-reveal (or topic-chat)
    await expect(page.getByText(/brain board/i)).toBeVisible({ timeout: 20_000 });

    await closeAllControllers(controllers);
  });

  test("skip through to board with categories", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    // Skip past topic-chat to category-reveal
    await skipToPhase(page, /brain board|double down/i, 5);

    // category-reveal -> clue-select (board)
    const skipBtn = page.getByRole("button", { name: /^skip$/i });
    await skipBtn.click();

    // Board should show dollar values
    await expect(page.getByText("$200").first()).toBeVisible({ timeout: 15_000 });

    await closeAllControllers(controllers);
  });

  test("skip advances through clue-select and answering phases", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    // Skip past topic-chat to category-reveal
    await skipToPhase(page, /brain board|double down/i, 5);

    // Skip from category-reveal through clue-select to answering
    // (host:skip during clue-select auto-selects a clue)
    await skipToPhase(page, /correct answer|everyone is answering/i, 10);

    // Should have advanced past clue-select
    const hasAnswering = await page
      .getByText(/everyone is answering/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasResult = await page
      .getByText(/correct answer/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasAnswering || hasResult).toBe(true);

    await closeAllControllers(controllers);
  });

  test("complete full game to final scores via skip", async ({ page, browser }) => {
    test.setTimeout(180_000);
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    // Skip past topic-chat first
    await skipToPhase(page, /brain board|double down/i, 5);

    // Force through entire game via skip
    await forceToFinalScores(page);

    // Game reached final-scores phase
    const hasRestart = await page
      .getByRole("button", { name: /^restart$/i })
      .isVisible()
      .catch(() => false);
    const hasFinalHeading = await page
      .getByRole("heading", { name: /final scores/i })
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasRestart || hasFinalHeading).toBe(true);

    await closeAllControllers(controllers);
  });

  test("final scores show rankings and player names", async ({ page, browser }) => {
    test.setTimeout(180_000);
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    // Skip past topic-chat first
    await skipToPhase(page, /brain board|double down/i, 5);

    await forceToFinalScores(page);

    // Game reached final-scores phase (Restart button visible OR heading shown)
    const hasRestart = await page
      .getByRole("button", { name: /^restart$/i })
      .isVisible()
      .catch(() => false);
    const hasFinalHeading = await page
      .getByRole("heading", { name: /final scores/i })
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasRestart || hasFinalHeading).toBe(true);

    // Player names visible (in final scores layout or ScoreBadge standings)
    await expect(page.getByText("Alpha", { exact: true })).toBeVisible();
    await expect(page.getByText("Beta", { exact: true })).toBeVisible();

    await closeAllControllers(controllers);
  });

  test("play again returns to lobby", async ({ page, browser }) => {
    test.setTimeout(180_000);
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    // Skip past topic-chat first
    await skipToPhase(page, /brain board|double down/i, 5);

    await forceToFinalScores(page);

    // Use End button to return to lobby (always visible at final-scores)
    const endBtn = page.getByRole("button", { name: /^end$/i });
    if (await endBtn.isVisible().catch(() => false)) {
      await endBtn.click();
    } else {
      // Fallback: try New Game button from FinalScoresLayout
      await page.getByRole("button", { name: /new game/i }).click();
    }

    // Should return to lobby with game selector
    await expect(page.getByRole("button", { name: /^Brain Board$/i })).toBeVisible({
      timeout: 20_000,
    });

    await closeAllControllers(controllers);
  });
});
