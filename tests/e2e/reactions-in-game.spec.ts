import { expect, test } from "@playwright/test";

import { closeAllControllers, skipToPhase, startGame } from "./e2e-helpers";

test.describe("Reactions During Active Gameplay", () => {
  test("reaction bar is visible during Brain Board gameplay", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    const skipButton = page.getByRole("button", { name: /^skip$/i });
    await skipButton.click(); // category-reveal -> clue-select

    // Both controllers should have reaction buttons during gameplay
    for (const controller of controllers) {
      const reactionButtons = controller.controllerPage.locator('button[aria-label^="React with"]');
      await expect(reactionButtons.first()).toBeVisible({ timeout: 15_000 });
      await expect(reactionButtons).toHaveCount(8);
    }

    // Click a reaction and verify it appears on host
    const firstController = controllers[0];
    if (!firstController) throw new Error("Expected at least one controller");
    const fireButton = firstController.controllerPage.getByRole("button", {
      name: /react with 🔥/i,
    });
    await fireButton.click();
    await expect(page.locator("text=🔥")).toBeVisible({ timeout: 5_000 });

    await closeAllControllers(controllers);
  });

  test("reaction bar is visible during Survey Smash gameplay", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });

    const skipButton = page.getByRole("button", { name: /^skip$/i });
    await skipButton.click(); // question-reveal -> face-off

    // All controllers should have reaction buttons
    for (const controller of controllers) {
      const reactionButtons = controller.controllerPage.locator('button[aria-label^="React with"]');
      await expect(reactionButtons.first()).toBeVisible({ timeout: 15_000 });
      await expect(reactionButtons).toHaveCount(8);
    }

    await closeAllControllers(controllers);
  });

  test("reaction bar is visible during Lucky Letters gameplay", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });

    const skipButton = page.getByRole("button", { name: /^skip$/i });
    await skipToPhase(page, /choose your categories/i);
    await skipButton.click();

    // Both controllers should have reaction buttons
    for (const controller of controllers) {
      const reactionButtons = controller.controllerPage.locator('button[aria-label^="React with"]');
      await expect(reactionButtons.first()).toBeVisible({ timeout: 15_000 });
      await expect(reactionButtons).toHaveCount(8);
    }

    await closeAllControllers(controllers);
  });

  test("reactions from multiple players appear on host simultaneously", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    const c1 = controllers[0];
    const c2 = controllers[1];
    if (!c1 || !c2) throw new Error("Expected at least two controllers");

    // Player 1 sends fire reaction
    const fireButton = c1.controllerPage.getByRole("button", {
      name: /react with 🔥/i,
    });
    await fireButton.click();
    await expect(page.locator("text=🔥")).toBeVisible({ timeout: 5_000 });

    // Wait briefly, then player 2 sends laugh
    await c2.controllerPage.waitForTimeout(200);
    const laughButton = c2.controllerPage.getByRole("button", {
      name: /react with 😂/i,
    });
    await laughButton.click();
    await expect(page.locator("text=😂")).toBeVisible({ timeout: 5_000 });

    await closeAllControllers(controllers);
  });
});
