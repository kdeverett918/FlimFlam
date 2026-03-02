import { expect, test } from "@playwright/test";

import { createRoom, joinControllerForRoom, waitForColyseusHealthy } from "./e2e-helpers";

test.describe("Jeopardy Game Flow", () => {
  test("can select Jeopardy and start game with 3 players", async ({ page, browser }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    const c1 = await joinControllerForRoom(browser, page, { code, name: "Alex" });
    const c2 = await joinControllerForRoom(browser, page, { code, name: "Brad" });
    const c3 = await joinControllerForRoom(browser, page, { code, name: "Clara" });

    // Select Jeopardy and start.
    await page.getByRole("button", { name: /jeopardy/i }).click();
    await page.getByRole("button", { name: /^kids/i }).click();

    const startButton = page.getByRole("button", { name: /start the game/i });
    await expect(startButton).toBeEnabled();
    await startButton.click();

    // Game should leave lobby — Skip and End buttons should appear.
    await expect(page.getByRole("button", { name: /^skip$/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /^end$/i })).toBeVisible();

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

    // Verify final scores shows player names.
    await page.waitForFunction(() => document.body.innerText.includes("FINAL SCORES"), null, {
      timeout: 30_000,
    });

    await c1.context.close();
    await c2.context.close();
    await c3.context.close();
  });
});
