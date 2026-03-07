import { type Page, expect, test } from "@playwright/test";

import {
  type JoinedController,
  closeAllControllers,
  driveSurveySmashToFinalScores,
  skipToPhase,
  startGame,
  submitTextAnswer,
} from "./e2e-helpers";

test.describe("Mid-Game Disconnect", () => {
  test("player disconnect during Brain Board answering continues game", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta", "Gamma"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // category-reveal -> clue-select
    await skipBtn.click();

    // Wait for clue-select
    await expect(page.getByText("$200").first()).toBeVisible({ timeout: 15_000 });

    // Find selector and pick a clue
    const deadline = Date.now() + 20_000;
    let selector: Page | null = null;
    while (Date.now() < deadline) {
      for (const cp of controllerPages) {
        const clueBtn = cp.locator('button[aria-label*=" for "]:enabled').first();
        if (await clueBtn.isVisible().catch(() => false)) {
          selector = cp;
          break;
        }
      }
      if (selector) break;
      await page.waitForTimeout(150);
    }
    expect(selector).toBeTruthy();
    await selector?.locator('button[aria-label*=" for "]:enabled').first().click();

    await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });

    // Close one controller mid-answer
    await (controllers[2] as JoinedController).context.close();

    // Remaining players submit
    await submitTextAnswer(controllerPages[0] as Page, "test answer");
    await submitTextAnswer(controllerPages[1] as Page, "another answer");

    // Skip forward — game should continue despite disconnect
    await skipBtn.click();
    await expect(page.getByText(/correct answer/i)).toBeVisible({ timeout: 20_000 });

    await (controllers[0] as JoinedController).context.close();
    await (controllers[1] as JoinedController).context.close();
  });

  test("player reconnect during Lucky Letters restores state", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // round-intro -> spinning
    await skipToPhase(page, /choose your categories/i);
    await skipBtn.click();

    // Wait for spinning phase
    await page.waitForTimeout(2000);

    // Reload one controller to simulate disconnect/reconnect
    const ctrl0 = controllers[0] as JoinedController;
    await ctrl0.controllerPage.reload();

    // Controller should reconnect and show the game state
    // It may show reconnecting briefly, then restore
    await expect(
      ctrl0.controllerPage
        .getByText(/lucky letters/i)
        .or(ctrl0.controllerPage.getByText(/spin/i))
        .or(ctrl0.controllerPage.getByText(/turn/i)),
    ).toBeVisible({ timeout: 30_000 });

    await closeAllControllers(controllers);
  });

  test("player disconnect during Survey Smash face-off", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // question-reveal -> face-off
    await skipBtn.click();
    await expect(page.getByText("VS")).toBeVisible({ timeout: 15_000 });

    // Close one controller during face-off
    await (controllers[2] as JoinedController).context.close();

    // Skip forward — game should proceed
    await skipBtn.click();

    // Game continues to guessing or next phase
    await page.waitForTimeout(2000);
    const skipStillVisible = await skipBtn.isVisible().catch(() => false);
    expect(skipStillVisible).toBe(true);

    // Drive to final scores to confirm game completes (remaining 2 controllers)
    const remainingControllers = [
      (controllers[0] as JoinedController).controllerPage,
      (controllers[1] as JoinedController).controllerPage,
    ];
    await driveSurveySmashToFinalScores(page, remainingControllers);
    await expect(page.getByRole("heading", { name: /final scores/i }).first()).toBeVisible();

    await (controllers[0] as JoinedController).context.close();
    await (controllers[1] as JoinedController).context.close();
  });

  test("host reconnect preserves game state", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    // Wait for game to start
    await expect(page.getByText(/brain board/i)).toBeVisible({ timeout: 20_000 });

    // Reload host page
    await page.reload();

    // Host should reconnect and show the game state
    // The board or skip/end buttons should be visible
    await expect(
      page
        .getByRole("button", { name: /^skip$/i })
        .or(page.getByRole("button", { name: /^end$/i })),
    ).toBeVisible({ timeout: 60_000 });

    await closeAllControllers(controllers);
  });
});
