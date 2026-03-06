import { expect, test } from "@playwright/test";

import { closeAllControllers, skipToPhase, startGame } from "./e2e-helpers";

test.describe("Lucky Letters Full Gameplay", () => {
  test("start to round intro with category", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });

    // Host shows ROUND 1 heading
    await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 30_000 });

    await closeAllControllers(controllers);
  });

  test("skip through rounds to spinning phase", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });

    // Skip past round-intro to spinning phase
    await skipToPhase(page, /spin the wheel/i, 10);
    await expect(page.getByText(/spin the wheel/i)).toBeVisible();

    await closeAllControllers(controllers);
  });

  test("skip advances through spinning phase", async ({ page, browser }) => {
    test.setTimeout(180_000);
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });

    // Skip to spinning
    await skipToPhase(page, /spin the wheel/i, 10);
    await expect(page.getByText(/spin the wheel/i)).toBeVisible();

    // Player names visible
    await expect(page.getByText("Ada", { exact: true })).toBeVisible();
    await expect(page.getByText("Ben", { exact: true })).toBeVisible();

    // End button returns to lobby cleanly
    await page.getByRole("button", { name: /^end$/i }).click();
    await expect(page.getByRole("button", { name: /^Lucky Letters$/i })).toBeVisible({
      timeout: 20_000,
    });

    await closeAllControllers(controllers);
  });

  test("standard mode starts and shows wheel", async ({ page, browser }) => {
    test.setTimeout(180_000);
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "standard",
      playerNames: ["Ada", "Ben"],
    });

    // Skip to spinning
    await skipToPhase(page, /spin the wheel/i, 10);
    await expect(page.getByText(/spin the wheel/i)).toBeVisible();

    await closeAllControllers(controllers);
  });
});
