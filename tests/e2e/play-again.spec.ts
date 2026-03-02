import { expect, test } from "@playwright/test";

import {
  autoplayHotTakeController,
  createRoom,
  joinControllerForRoom,
  waitForColyseusHealthy,
} from "./e2e-helpers";

test.describe("Play Again / New Game flow", () => {
  test("final scores shows Play Again and New Game buttons, Play Again restarts game", async ({
    page,
    browser,
  }) => {
    await page.goto("/");

    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    const c1 = await joinControllerForRoom(browser, page, { code, name: "Alice" });
    const c2 = await joinControllerForRoom(browser, page, { code, name: "Bob" });
    const c3 = await joinControllerForRoom(browser, page, { code, name: "Casey" });

    // Select Hot Take (no AI needed) and start.
    await page.getByRole("button", { name: /hot take/i }).click();
    await page.getByRole("button", { name: /^kids/i }).click();

    const startButton = page.getByRole("button", { name: /start the game/i });
    await expect(startButton).toBeEnabled();
    await startButton.click();

    let gameOver = false;

    const controllerRuns = Promise.all([
      autoplayHotTakeController(c1.controllerPage, {
        isGameOver: () => gameOver,
        topic: "remote work etiquette",
      }),
      autoplayHotTakeController(c2.controllerPage, {
        isGameOver: () => gameOver,
        topic: "remote work etiquette",
      }),
      autoplayHotTakeController(c3.controllerPage, {
        isGameOver: () => gameOver,
        topic: "remote work etiquette",
      }),
    ]);

    // Wait for final scores.
    await page.waitForFunction(() => document.body.innerText.includes("FINAL SCORES"), null, {
      timeout: 60_000,
    });
    gameOver = true;
    await controllerRuns;

    // Verify the final scores screen shows Play Again and New Game buttons.
    const playAgainBtn = page.getByRole("button", { name: /play again/i });
    const newGameBtn = page.getByRole("button", { name: /new game/i });

    await expect(playAgainBtn).toBeVisible({ timeout: 10_000 });
    await expect(newGameBtn).toBeVisible({ timeout: 10_000 });

    // Click "Play Again" — should restart the game (leave final-scores).
    await playAgainBtn.click();

    // After restart, the game should go back to an active phase (not lobby, not final-scores).
    // The host should stop showing "FINAL SCORES".
    await expect(page.getByRole("heading", { name: /^FINAL SCORES$/ })).toHaveCount(0, {
      timeout: 30_000,
    });

    await c1.context.close();
    await c2.context.close();
    await c3.context.close();
  });

  test("New Game button returns to lobby", async ({ page, browser }) => {
    await page.goto("/");

    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    const c1 = await joinControllerForRoom(browser, page, { code, name: "Dan" });
    const c2 = await joinControllerForRoom(browser, page, { code, name: "Eve" });
    const c3 = await joinControllerForRoom(browser, page, { code, name: "Faye" });

    // Start a Hot Take game.
    await page.getByRole("button", { name: /hot take/i }).click();
    await page.getByRole("button", { name: /^kids/i }).click();

    const startButton = page.getByRole("button", { name: /start the game/i });
    await expect(startButton).toBeEnabled();
    await startButton.click();

    let gameOver = false;

    const controllerRuns = Promise.all([
      autoplayHotTakeController(c1.controllerPage, {
        isGameOver: () => gameOver,
        topic: "breakfast vs dinner",
      }),
      autoplayHotTakeController(c2.controllerPage, {
        isGameOver: () => gameOver,
        topic: "breakfast vs dinner",
      }),
      autoplayHotTakeController(c3.controllerPage, {
        isGameOver: () => gameOver,
        topic: "breakfast vs dinner",
      }),
    ]);

    await page.waitForFunction(() => document.body.innerText.includes("FINAL SCORES"), null, {
      timeout: 60_000,
    });
    gameOver = true;
    await controllerRuns;

    // Click "New Game" — should return to lobby.
    const newGameBtn = page.getByRole("button", { name: /new game/i });
    await expect(newGameBtn).toBeVisible({ timeout: 10_000 });
    await newGameBtn.click();

    // Should return to the lobby — game selector buttons and complexity picker should be visible again.
    await expect(page.getByRole("button", { name: /^kids/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /standard/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^PLAYERS$/ })).toBeVisible();

    await c1.context.close();
    await c2.context.close();
    await c3.context.close();
  });
});
