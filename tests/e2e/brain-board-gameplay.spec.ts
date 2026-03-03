import { expect, test } from "@playwright/test";

import {
  closeAllControllers,
  findBrainBoardSelectorController,
  startGame,
  submitTextAnswer,
} from "./e2e-helpers";

test.describe("Brain Board Gameplay", () => {
  test("shows category reveal with categories on host", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    // Host displays "BRAIN BOARD!" heading on category-reveal
    await expect(page.getByText(/brain board/i)).toBeVisible({ timeout: 20_000 });

    await closeAllControllers(controllers);
  });

  test("clue-select shows board grid", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // category-reveal -> clue-select
    await skipBtn.click();

    // Host shows the board with dollar values
    await expect(page.getByText("$200").first()).toBeVisible({ timeout: 15_000 });

    // Selector controller should see the clue grid
    const selector = await findBrainBoardSelectorController(controllerPages);
    const clueBtn = selector.locator('button[aria-label*=" for "]:enabled').first();
    await expect(clueBtn).toBeVisible({ timeout: 15_000 });

    await closeAllControllers(controllers);
  });

  test("answering phase shows clue and accepts answers", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // category-reveal -> clue-select
    await skipBtn.click();

    // Selector picks a clue
    const selector = await findBrainBoardSelectorController(controllerPages);
    const firstClue = selector.locator('button[aria-label*=" for "]:enabled').first();
    await expect(firstClue).toBeVisible({ timeout: 15_000 });
    await firstClue.click();

    // Host shows answering phase
    await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });

    // Both controllers should get textbox to submit answers
    for (const cp of controllerPages) {
      await expect(cp.getByRole("textbox").first()).toBeVisible({ timeout: 15_000 });
    }

    // Submit answers
    await submitTextAnswer(controllerPages[0], "wrong answer one");
    await submitTextAnswer(controllerPages[1], "wrong answer two");

    await closeAllControllers(controllers);
  });

  test("clue-result shows correct answer and player answers", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // category-reveal -> clue-select
    await skipBtn.click();

    // Selector picks a clue
    const selector = await findBrainBoardSelectorController(controllerPages);
    const firstClue = selector.locator('button[aria-label*=" for "]:enabled').first();
    await expect(firstClue).toBeVisible({ timeout: 15_000 });
    await firstClue.click();

    await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });
    await submitTextAnswer(controllerPages[0], "wrong answer");
    await submitTextAnswer(controllerPages[1], "also wrong");

    // Wait for clue-result; skipping here can jump past result if it already resolved.
    await expect(page.getByText(/correct answer/i)).toBeVisible({ timeout: 20_000 });

    // Both player names should appear in result
    await expect(page.getByText("Alpha", { exact: true })).toBeVisible();
    await expect(page.getByText("Beta", { exact: true })).toBeVisible();

    await closeAllControllers(controllers);
  });

  test("selector rotation advances after each clue", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // category-reveal -> clue-select
    await skipBtn.click();

    const firstPickerText =
      (
        await page
          .getByText(/'s pick$/i)
          .first()
          .textContent()
      )?.trim() ?? "";

    // First selector picks a clue
    const firstSelector = await findBrainBoardSelectorController(controllerPages);
    const firstClue = firstSelector.locator('button[aria-label*=" for "]:enabled').first();
    await expect(firstClue).toBeVisible({ timeout: 15_000 });
    await firstClue.click();

    await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });
    await skipBtn.click(); // answering -> clue-result
    await skipBtn.click(); // clue-result -> clue-select

    // Host picker label should rotate to a different player.
    const secondPickerText =
      (
        await page
          .getByText(/'s pick$/i)
          .first()
          .textContent()
      )?.trim() ?? "";
    expect(secondPickerText).not.toBe("");
    expect(secondPickerText).not.toBe(firstPickerText);

    await closeAllControllers(controllers);
  });

  test("standard mode starts with round-one clue values", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "standard",
      playerNames: ["Alpha", "Beta"],
    });
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // category-reveal -> clue-select
    await skipBtn.click();

    // Round one should use base clue values (starts at $200, not doubled).
    await expect(page.getByText("$200").first()).toBeVisible({ timeout: 20_000 });

    await closeAllControllers(controllers);
  });
});
