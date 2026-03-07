import { expect, test } from "@playwright/test";

import { closeAllControllers, skipToPhase, startGame } from "./e2e-helpers";

test.describe("Host Controls", () => {
  test("skip advances phase in Brain Board", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // Should start at category-reveal with "BRAIN BOARD!" text
    await expect(page.getByText(/brain board/i)).toBeVisible({ timeout: 20_000 });

    // Skip -> clue-select (should show board grid with dollar values)
    await skipBtn.click();
    await expect(page.getByText("$200").first()).toBeVisible({ timeout: 15_000 });

    await closeAllControllers(controllers);
  });

  test("skip advances phase in Survey Smash", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // Should start at question-reveal
    await expect(page.getByText(/round 1 of \d/i)).toBeVisible({ timeout: 20_000 });

    // Skip -> face-off (should show VS)
    await skipBtn.click();
    await expect(page.getByText("VS")).toBeVisible({ timeout: 15_000 });

    await closeAllControllers(controllers);
  });

  test("skip advances phase in Lucky Letters", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // Should start at round-intro with "ROUND 1"
    await skipToPhase(page, /choose your categories/i);

    // Skip -> spinning (one controller should see spin button)
    await skipBtn.click();

    // Wait for spinning phase — one controller shows the spin button
    const deadline = Date.now() + 15_000;
    let foundSpin = false;
    while (Date.now() < deadline) {
      for (const cp of controllerPages) {
        if (
          await cp
            .getByRole("button", { name: /spin the wheel/i })
            .isVisible()
            .catch(() => false)
        ) {
          foundSpin = true;
          break;
        }
      }
      if (foundSpin) break;
      await page.waitForTimeout(200);
    }
    expect(foundSpin).toBe(true);

    await closeAllControllers(controllers);
  });

  test("end button returns to lobby from any game", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    // Wait for game to start
    await expect(page.getByText(/brain board/i)).toBeVisible({ timeout: 20_000 });

    // Click End button
    const endBtn = page.getByRole("button", { name: /^end$/i });
    await expect(endBtn).toBeVisible({ timeout: 10_000 });
    await endBtn.click();

    // Host should return to lobby
    await expect(page.getByRole("heading", { name: /^players$/i })).toBeVisible({
      timeout: 20_000,
    });

    // Controllers should show "You're in!"
    for (const c of controllers) {
      await expect(c.controllerPage.getByText(/you're in/i)).toBeVisible({ timeout: 20_000 });
    }

    await closeAllControllers(controllers);
  });
});
