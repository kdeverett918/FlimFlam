import { expect, test } from "@playwright/test";

import { createRoom, joinControllerForRoom, waitForColyseusHealthy } from "./e2e-helpers";

test.describe("Family Feud Game Flow", () => {
  test("can select Family Feud and start game with 3 players", async ({ page, browser }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    const c1 = await joinControllerForRoom(browser, page, { code, name: "Steve" });
    const c2 = await joinControllerForRoom(browser, page, { code, name: "Keisha" });
    const c3 = await joinControllerForRoom(browser, page, { code, name: "Marco" });

    // Select Family Feud and start.
    await page.getByRole("button", { name: /family feud/i }).click();
    await page.getByRole("button", { name: /^kids/i }).click();

    const startButton = page.getByRole("button", { name: /start the game/i });
    await expect(startButton).toBeEnabled();
    await startButton.click();

    // Game should leave lobby.
    await expect(page.getByRole("button", { name: /^skip$/i })).toBeVisible({ timeout: 30_000 });

    // Skip through to final scores.
    for (let i = 0; i < 40; i++) {
      const skipBtn = page.getByRole("button", { name: /^skip$/i });
      if (await skipBtn.isVisible().catch(() => false)) {
        await skipBtn.click();
        await page.waitForTimeout(200);
      }

      const text = await page.evaluate(() => document.body.innerText);
      if (text.includes("FINAL SCORES")) break;
    }

    await page.waitForFunction(() => document.body.innerText.includes("FINAL SCORES"), null, {
      timeout: 30_000,
    });

    await c1.context.close();
    await c2.context.close();
    await c3.context.close();
  });
});
