import { type Page, expect, test } from "@playwright/test";

import { createRoom, joinControllerForRoom, waitForColyseusHealthy } from "./e2e-helpers";

async function submitBrainBattleTopics(controllerPage: Page, topic: string) {
  await expect(controllerPage.getByRole("button", { name: /submit topics/i })).toBeVisible({
    timeout: 60_000,
  });

  await controllerPage.getByLabel("Topic 1").fill(topic);
  await controllerPage.getByRole("button", { name: /submit topics/i }).click();

  await expect(controllerPage.getByText(/topics submitted!/i)).toBeVisible({ timeout: 30_000 });
}

test("brain battle completes end-to-end (host skip speedrun)", async ({ page, browser }) => {
  await page.goto("/");
  await waitForColyseusHealthy(page);

  const { code } = await createRoom(page);

  const c1 = await joinControllerForRoom(browser, page, { code, name: "Alice" });
  const c2 = await joinControllerForRoom(browser, page, { code, name: "Bob" });
  const c3 = await joinControllerForRoom(browser, page, { code, name: "Casey" });

  // Select game + difficulty and start.
  await page.getByRole("button", { name: /brain battle/i }).click();
  await page.getByRole("button", { name: /^kids/i }).click();
  const startButton = page.getByRole("button", { name: /start the game/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  // Submit topics on all controllers.
  await Promise.all([
    submitBrainBattleTopics(c1.controllerPage, "Space"),
    submitBrainBattleTopics(c2.controllerPage, "Animals"),
    submitBrainBattleTopics(c3.controllerPage, "Movies"),
  ]);

  const skipBtn = page.getByRole("button", { name: /^skip$/i });

  // Move immediately into board generation.
  await skipBtn.click();

  // Wait for a board to be visible (any clue value cell).
  await expect(page.getByText("$200", { exact: true }).first()).toBeVisible({ timeout: 120_000 });

  // Speedrun the whole board: skip progresses phases synchronously in the server plugin.
  // We avoid AI answer judging by never buzzing.
  const finalScoresHeading = page.getByRole("heading", { name: /^FINAL SCORES$/ });
  for (let i = 0; i < 140; i++) {
    if (await finalScoresHeading.isVisible().catch(() => false)) break;
    await skipBtn.click();
    await page.waitForTimeout(150);
  }

  await expect(finalScoresHeading).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Alice")).toBeVisible();
  await expect(page.getByText("Bob")).toBeVisible();
  await expect(page.getByText("Casey")).toBeVisible();

  await c1.context.close();
  await c2.context.close();
  await c3.context.close();
});
