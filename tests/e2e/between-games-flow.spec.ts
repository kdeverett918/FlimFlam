import { type Page, expect, test } from "@playwright/test";

import { closeAllControllers, selectGameAndStart, startGame } from "./e2e-helpers";

async function endGameToLobby(page: Page): Promise<void> {
  const endButton = page.getByRole("button", { name: /^end$/i });
  const lobbyStartButton = page.getByRole("button", { name: /start game|waiting for players/i });
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (await lobbyStartButton.isVisible().catch(() => false)) {
      // Wait for lobby to stabilize after transition
      await page.waitForTimeout(1_000);
      // Verify lobby is still showing
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

test.describe("Between Games Flow", () => {
  test("host can end game and select a different game", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Ari", "Bea"],
    });

    await endGameToLobby(page);

    await selectGameAndStart(page, { gameName: "Lucky Letters", complexity: "kids" });
    await expect(page.getByText(/lucky letters/i)).toBeVisible({ timeout: 20_000 });

    await closeAllControllers(controllers);
  });

  test("controllers stay connected after host returns to lobby", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Ari", "Bea"],
    });

    await endGameToLobby(page);

    for (const controller of controllers) {
      await expect(controller.controllerPage.getByText(/you're in/i)).toBeVisible({
        timeout: 20_000,
      });
    }

    await closeAllControllers(controllers);
  });
});
