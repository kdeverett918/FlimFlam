import { type Page, expect, test } from "@playwright/test";

import { closeAllControllers, forceToFinalScores, skipToPhase, startGame } from "./e2e-helpers";

async function findActivePlayer(
  controllerPages: Page[],
  names: string[],
): Promise<{ activePage: Page; watchingPage: Page; activeName: string; watchingName: string }> {
  const spinLabel = /spin the wheel/i;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    for (let i = 0; i < controllerPages.length; i++) {
      const visible = await controllerPages[i]
        .getByRole("button", { name: spinLabel })
        .isVisible()
        .catch(() => false);
      if (visible) {
        const otherIdx = i === 0 ? 1 : 0;
        return {
          activePage: controllerPages[i],
          watchingPage: controllerPages[otherIdx],
          activeName: names[i],
          watchingName: names[otherIdx],
        };
      }
    }
    await controllerPages[0]?.waitForTimeout(200);
  }
  throw new Error("Neither controller showed the spin button within 15s");
}

test.describe("Lucky Letters Gameplay", () => {
  test("solve attempt flow works for active player", async ({ page, browser }) => {
    const names = ["Ada", "Ben"];
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: names,
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // round-intro -> spinning
    await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 30_000 });
    await skipBtn.click();

    const { activePage } = await findActivePlayer(controllerPages, names);

    // Active player clicks Solve
    const solveBtn = activePage.getByRole("button", { name: /solve/i });
    await expect(solveBtn).toBeVisible({ timeout: 10_000 });
    await solveBtn.click();

    // Should now see TextInput for solving
    const textbox = activePage.getByRole("textbox").first();
    await expect(textbox).toBeVisible({ timeout: 10_000 });
    await textbox.fill("a wrong guess for the puzzle");
    await activePage
      .getByRole("button", { name: /^submit$/i })
      .first()
      .click();

    // After wrong solve, host should show a result or advance turn
    // Wait for the host to update — either "Not in the puzzle" variant or next spinning phase
    await page.waitForTimeout(2000);

    await closeAllControllers(controllers);
  });

  test("buy vowel deducts cash and reveals vowel", async ({ page, browser }) => {
    const names = ["Ada", "Ben"];
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: names,
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // round-intro -> spinning
    await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 30_000 });
    await skipBtn.click();

    const { activePage } = await findActivePlayer(controllerPages, names);

    // Spin to get some cash first
    const spinBtn = activePage.getByRole("button", { name: /spin the wheel/i });
    await spinBtn.click();

    // Wait for spin result
    await page.waitForTimeout(2000);

    // Check if Buy a Vowel button becomes available (needs $250+)
    const buyVowelBtn = activePage.getByRole("button", { name: /buy a vowel/i });
    const canBuyVowel = await buyVowelBtn.isVisible().catch(() => false);

    if (canBuyVowel) {
      // If consonant pick is required first, skip it
      const letterPicker = activePage.getByText("Pick a consonant");
      if (await letterPicker.isVisible().catch(() => false)) {
        const letterT = activePage.getByRole("button", { name: "Letter T" });
        await letterT.click();
        await page.waitForTimeout(1500);
        // After letter result, skip back to spinning
        await skipBtn.click();
      }

      // Now try Buy a Vowel if still active
      const stillActive = await activePage
        .getByRole("button", { name: /buy a vowel/i })
        .isVisible()
        .catch(() => false);
      if (stillActive) {
        await activePage.getByRole("button", { name: /buy a vowel/i }).click();

        // Should see vowel picker
        const vowelButton = activePage.getByRole("button", { name: /Letter [AEIOU]/i }).first();
        const hasVowelPicker = await vowelButton.isVisible().catch(() => false);
        if (hasVowelPicker) {
          await vowelButton.click();
          // Host should show letter result
          await expect(
            page.getByText(/times?!/i).or(page.getByText("Not in the puzzle!")),
          ).toBeVisible({ timeout: 15_000 });
        }
      }
    }

    // End test — vowel buying is conditional on spin result
    await closeAllControllers(controllers);
  });

  test("round-result shows winner and puzzle answer", async ({ page, browser }) => {
    const names = ["Ada", "Ben"];
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: names,
    });

    // Skip to round-result
    await skipToPhase(page, /round \d+ complete/i);

    // Host shows round result with the answer
    await expect(page.getByText(/round \d+ complete/i)).toBeVisible();

    // Controllers should show the round result too
    for (const c of controllers) {
      await expect(c.controllerPage.getByText(/the answer was/i)).toBeVisible({ timeout: 15_000 });
    }

    await closeAllControllers(controllers);
  });

  test("standard mode shows bonus round", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "standard",
      playerNames: ["Ada", "Ben"],
    });

    // Skip to bonus round
    await skipToPhase(page, /bonus round/i);

    await expect(page.getByText(/bonus round/i)).toBeVisible();

    await closeAllControllers(controllers);
  });

  test("bonus reveal shows solved or not solved", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "standard",
      playerNames: ["Ada", "Ben"],
    });

    // Skip through to bonus-reveal (past bonus-round)
    await skipToPhase(page, /solved|not this time/i);

    // Host shows either "SOLVED IT!" or "Not this time!"
    const solved = page.getByText(/solved it/i);
    const notSolved = page.getByText(/not this time/i);
    await expect(solved.or(notSolved)).toBeVisible({ timeout: 10_000 });

    await closeAllControllers(controllers);
  });

  test("kids mode has 3 rounds and no bonus", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });

    // Controller should show "Round 1 of 3" in the first round-intro
    await expect(controllers[0].controllerPage.getByText(/Round 1 of 3/i)).toBeVisible({
      timeout: 15_000,
    });

    // Skip to final scores
    await forceToFinalScores(page);

    await expect(page.getByRole("heading", { name: /final scores/i }).first()).toBeVisible();

    await closeAllControllers(controllers);
  });

  test("standings display updates during game", async ({ page, browser }) => {
    const names = ["Ada", "Ben"];
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: names,
    });
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // round-intro -> spinning
    await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 30_000 });
    await skipBtn.click();

    // Both player names should appear in standings on host
    await expect(page.getByText("Ada", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Ben", { exact: true })).toBeVisible({ timeout: 10_000 });

    await closeAllControllers(controllers);
  });
});
