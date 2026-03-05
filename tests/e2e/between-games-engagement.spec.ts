import { type Page, expect, test } from "@playwright/test";

import { closeAllControllers, selectGameAndStart, startGame } from "./e2e-helpers";

async function endGameToLobby(page: Page): Promise<void> {
  const endButton = page.getByRole("button", { name: /^end$/i });
  const lobbyStartButton = page.getByRole("button", { name: /start game|waiting for players/i });
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (await lobbyStartButton.isVisible().catch(() => false)) {
      await page.waitForTimeout(1_000);
      if (await lobbyStartButton.isVisible().catch(() => false)) {
        return;
      }
    }
    if (await endButton.isVisible().catch(() => false)) {
      await endButton.click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(300);
  }

  await expect(lobbyStartButton).toBeVisible({ timeout: 10_000 });
}

test.describe("Between Games Engagement", () => {
  test("controllers return to lobby state when host ends game and starts new one", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);

    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Ari", "Bea"],
    });

    await endGameToLobby(page);

    // Controllers should show "You're in!" lobby waiting state
    for (const controller of controllers) {
      await expect(controller.controllerPage.getByText(/you're in/i)).toBeVisible({
        timeout: 20_000,
      });
    }

    // Start a different game
    await selectGameAndStart(page, { gameName: "Survey Smash", complexity: "kids" });

    // Verify game started — host should show survey smash content or skip button
    await expect(page.getByRole("button", { name: /^skip$/i })).toBeVisible({ timeout: 30_000 });

    // Controllers should have transitioned to the new game (no longer showing "You're in!")
    for (const controller of controllers) {
      const stillInLobby = await controller.controllerPage
        .getByText(/you're in/i)
        .isVisible()
        .catch(() => false);
      // They should have moved past the lobby state
      // (they may show game-specific UI, reaction bar, context card, etc.)
      if (stillInLobby) {
        // Give extra time for the transition
        await controller.controllerPage.waitForTimeout(3_000);
      }
      const reactionButtons = controller.controllerPage.locator('button[aria-label^="React with"]');
      await expect(reactionButtons.first()).toBeVisible({ timeout: 15_000 });
    }

    await closeAllControllers(controllers);
  });

  test("host can cycle through all three games in one session", async ({ page, browser }) => {
    test.setTimeout(180_000);

    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Ari", "Bea"],
    });

    // Game 1: Brain Board
    await expect(page.getByRole("button", { name: /^skip$/i })).toBeVisible({ timeout: 30_000 });

    // End game 1
    await endGameToLobby(page);

    // Game 2: Lucky Letters
    await selectGameAndStart(page, { gameName: "Lucky Letters", complexity: "kids" });
    await expect(page.getByText(/lucky letters/i)).toBeVisible({ timeout: 20_000 });

    // End game 2
    await endGameToLobby(page);

    // Game 3: Survey Smash
    await selectGameAndStart(page, { gameName: "Survey Smash", complexity: "kids" });
    await expect(page.getByRole("button", { name: /^skip$/i })).toBeVisible({ timeout: 30_000 });

    // Verify controllers survived the whole cycle
    for (const controller of controllers) {
      expect(controller.controllerPage.isClosed()).toBe(false);
    }

    await closeAllControllers(controllers);
  });
});
