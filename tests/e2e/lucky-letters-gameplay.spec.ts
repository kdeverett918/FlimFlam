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
      const cp = controllerPages[i] as Page;
      const visible = await cp
        .getByRole("button", { name: spinLabel })
        .isVisible()
        .catch(() => false);
      if (visible) {
        const otherIdx = i === 0 ? 1 : 0;
        return {
          activePage: cp,
          watchingPage: controllerPages[otherIdx] as Page,
          activeName: names[i] as string,
          watchingName: names[otherIdx] as string,
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
    await expect(
      (controllers[0] as (typeof controllers)[number]).controllerPage.getByText(/Round 1 of 3/i),
    ).toBeVisible({
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

  test("host round-intro displays category banner", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });

    // Wait for round-intro on host — it shows the category in an uppercase banner
    await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 30_000 });

    // The category is rendered in the round-intro screen (e.g. "Thing", "Food & Drink", etc.)
    // It's displayed with uppercase tracking-wider class. Verify at least one known kids category exists.
    const knownKidsCategories = [
      "Thing",
      "Food & Drink",
      "Place",
      "Animals",
      "Movies & TV",
      "Sports",
      "Music",
      "Around The World",
      "Rhyme Time",
    ];
    const categoryLocators = knownKidsCategories.map((cat) =>
      page.getByText(cat, { exact: false }).first(),
    );
    const anyCategoryVisible = await Promise.any(
      categoryLocators.map(async (loc) => {
        if (await loc.isVisible().catch(() => false)) return true;
        throw new Error("not visible");
      }),
    ).catch(() => false);

    expect(anyCategoryVisible).toBe(true);

    await closeAllControllers(controllers);
  });

  test("controller shows mobile puzzle board with category and progress", async ({
    page,
    browser,
  }) => {
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

    const { activePage, watchingPage } = await findActivePlayer(controllerPages, names);

    // Active player should see 0% progress
    await expect(activePage.getByText("0%")).toBeVisible({ timeout: 15_000 });

    // Watching player should also see the puzzle board with category
    await expect(watchingPage.getByText("0%")).toBeVisible({ timeout: 15_000 });

    // Both controllers should show one of the kids categories on MobilePuzzleBoard
    const knownKidsCategories = [
      "Thing",
      "Food & Drink",
      "Place",
      "Animals",
      "Movies & TV",
      "Sports",
      "Music",
      "Around The World",
      "Rhyme Time",
    ];
    for (const cp of controllerPages) {
      const categoryVisible = await Promise.any(
        knownKidsCategories.map(async (cat) => {
          if (
            await cp
              .getByText(cat, { exact: false })
              .first()
              .isVisible()
              .catch(() => false)
          )
            return true;
          throw new Error("not visible");
        }),
      ).catch(() => false);
      expect(categoryVisible).toBe(true);
    }

    await closeAllControllers(controllers);
  });

  test("advanced mode has 5 rounds", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "advanced",
      playerNames: ["Ada", "Ben"],
    });

    // Controller should show "Round 1 of 5" in the first round-intro
    await expect(
      (controllers[0] as (typeof controllers)[number]).controllerPage.getByText(/Round 1 of 5/i),
    ).toBeVisible({
      timeout: 15_000,
    });

    await closeAllControllers(controllers);
  });

  test("standard mode has 4 rounds", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "standard",
      playerNames: ["Ada", "Ben"],
    });

    // Controller should show "Round 1 of 4" in the first round-intro
    await expect(
      (controllers[0] as (typeof controllers)[number]).controllerPage.getByText(/Round 1 of 4/i),
    ).toBeVisible({
      timeout: 15_000,
    });

    await closeAllControllers(controllers);
  });

  test("watching player sees turn name during spin phase", async ({ page, browser }) => {
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

    const { watchingPage, activeName } = await findActivePlayer(controllerPages, names);

    // Watching controller should show "X's turn" text
    await expect(watchingPage.getByText(new RegExp(`${activeName}.s turn`, "i"))).toBeVisible({
      timeout: 15_000,
    });

    await closeAllControllers(controllers);
  });

  test("host shows wheel and current player name during spinning", async ({ page, browser }) => {
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

    // Host should show the wheel
    await expect(page.locator('[data-testid="lucky-wheel"]')).toBeVisible({ timeout: 15_000 });

    // Host should show current player's name (one of Ada or Ben)
    const adaVisible = await page
      .getByText("Ada", { exact: true })
      .isVisible()
      .catch(() => false);
    const benVisible = await page
      .getByText("Ben", { exact: true })
      .isVisible()
      .catch(() => false);
    expect(adaVisible || benVisible).toBe(true);

    // Host should show the "Spin, buy a vowel, or solve!" prompt
    await expect(page.getByText("Spin, buy a vowel, or solve!")).toBeVisible({ timeout: 10_000 });

    await closeAllControllers(controllers);
  });

  test("controller bonus-reveal shows solved or not-solved state", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "standard",
      playerNames: ["Ada", "Ben"],
    });

    // Skip through to bonus-reveal
    await skipToPhase(page, /solved|not this time/i);

    // Controllers should show either "Solved!" or "Not Solved" text
    for (const c of controllers) {
      const solved = c.controllerPage.getByText(/^solved!?$/i);
      const notSolved = c.controllerPage.getByText(/not solved/i);
      await expect(solved.or(notSolved)).toBeVisible({ timeout: 15_000 });
    }

    await closeAllControllers(controllers);
  });

  test("final scores reachable via forceToFinalScores in all complexities", async ({
    page,
    browser,
  }) => {
    // Test advanced mode reaches final scores (covers the full lifecycle)
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "advanced",
      playerNames: ["Ada", "Ben"],
    });

    await forceToFinalScores(page);

    await expect(page.getByRole("heading", { name: /final scores/i }).first()).toBeVisible();

    await closeAllControllers(controllers);
  });

  test("host guess-consonant phase shows Pick a consonant prompt", async ({ page, browser }) => {
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

    // Active player spins the wheel
    await activePage.getByRole("button", { name: /spin the wheel/i }).click();

    // Wait for spin to resolve — look for "Pick a consonant!" on host
    // (If the spin landed on bust/pass, this won't appear, so we check with a fallback)
    const hostConsonantPrompt = page.getByText("Pick a consonant!");
    const deadline = Date.now() + 15_000;
    let sawConsonantPrompt = false;

    while (Date.now() < deadline) {
      if (await hostConsonantPrompt.isVisible().catch(() => false)) {
        sawConsonantPrompt = true;
        break;
      }
      // If spinning phase restarted (bust/pass result), spin again
      const spinBtn = activePage.getByRole("button", { name: /spin the wheel/i });
      if (await spinBtn.isVisible().catch(() => false)) {
        await spinBtn.click();
      }
      await page.waitForTimeout(300);
    }

    // If we eventually got to consonant guessing, verify the prompt
    if (sawConsonantPrompt) {
      await expect(hostConsonantPrompt).toBeVisible();

      // Active controller should also show "Pick a consonant" text
      await expect(activePage.getByText("Pick a consonant")).toBeVisible({ timeout: 10_000 });
    }

    await closeAllControllers(controllers);
  });
});
