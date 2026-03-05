import { expect, test } from "@playwright/test";

import {
  closeAllControllers,
  createRoom,
  forceToFinalScores,
  joinControllersForRoom,
  selectGameAndStart,
  waitForColyseusHealthy,
} from "./e2e-helpers";

test.describe("Cross-Game Sessions", () => {
  test("play Brain Board then start Survey Smash via play again", async ({ page, browser }) => {
    test.setTimeout(180_000);
    await page.goto("/");
    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    const controllers = await joinControllersForRoom(browser, page, code, ["Xena", "York"]);

    // Start Brain Board
    await selectGameAndStart(page, { gameName: "Brain Board", complexity: "kids" });
    await expect(page.getByText(/brain board/i)).toBeVisible({ timeout: 20_000 });

    // Force through entire game to final scores
    await forceToFinalScores(page);

    // Use End button to return to lobby (always visible at final-scores)
    const endBtn = page.getByRole("button", { name: /^end$/i });
    if (await endBtn.isVisible().catch(() => false)) {
      await endBtn.click();
    } else {
      await page.getByRole("button", { name: /new game/i }).click();
    }

    // Should be back in lobby with game selector
    await expect(page.getByRole("button", { name: /^Survey Smash$/i })).toBeVisible({
      timeout: 20_000,
    });

    // Select Survey Smash and start
    await selectGameAndStart(page, { gameName: "Survey Smash", complexity: "kids" });

    // Should be in Survey Smash — shows round info or gameplay content
    await expect(
      page.getByText(/round|VS|name a|what is|strike|the people say/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    await closeAllControllers(controllers);
  });

  test("switch game selection in lobby before starting", async ({ page, browser }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    const controllers = await joinControllersForRoom(browser, page, code, ["Alpha", "Beta"]);

    // Select Brain Board
    const bbBtn = page.getByRole("button", { name: /^Brain Board$/i });
    await bbBtn.click();
    await expect(bbBtn).toHaveAttribute("aria-pressed", "true");

    // Switch to Lucky Letters
    const llBtn = page.getByRole("button", { name: /^Lucky Letters$/i });
    await llBtn.click();
    await expect(llBtn).toHaveAttribute("aria-pressed", "true");
    await expect(bbBtn).toHaveAttribute("aria-pressed", "false");

    // Start Lucky Letters
    await page.getByRole("button", { name: /^kids/i }).click();
    const startBtn = page.getByRole("button", { name: /start game/i });
    await expect(startBtn).toBeEnabled({ timeout: 15_000 });
    await startBtn.click();

    // Should be in Lucky Letters — shows ROUND 1
    await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 30_000 });

    await closeAllControllers(controllers);
  });
});
