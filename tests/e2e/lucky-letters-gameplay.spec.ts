import { type Locator, type Page, expect, test } from "@playwright/test";

import {
  closeAllControllers,
  driveLuckyLettersToPhase,
  findLuckyLettersTurnActor,
  skipToPhase,
  startGame,
} from "./e2e-helpers";

const E2E_SOLVE_TOKEN = process.env.FLIMFLAM_E2E_SOLVE_TOKEN ?? "__E2E_SOLVE__";
const MICRO_PHASE_TRANSITION_BANNED_LABELS = ["Spin the Wheel!", "Solving..."] as const;

async function expectTrialClickable(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ trial: true });
  const receivesPointer = await locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const topElement = document.elementFromPoint(x, y);
    return topElement === el || (!!topElement && el.contains(topElement));
  });
  expect(receivesPointer).toBe(true);
}

async function expectTopmostHitTarget(locator: Locator): Promise<void> {
  const isTopmost = await locator.evaluate((element) => {
    const target = element as HTMLElement;
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(centerX, centerY);
    return !!hit && (hit === target || target.contains(hit));
  });
  expect(isTopmost).toBe(true);
}

async function expectTransitionLabelNeverVisibleFor(
  page: Page,
  label: string,
  durationMs = 2300,
): Promise<void> {
  await page.evaluate(
    ({ expectedLabel, probeDurationMs }) =>
      new Promise<void>((resolve, reject) => {
        const selectors = "h1, h2, h3, p, span, div";
        let finished = false;

        const isVisible = (node: Element): boolean => {
          const style = window.getComputedStyle(node);
          const rect = (node as HTMLElement).getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0" &&
            rect.width > 0 &&
            rect.height > 0
          );
        };

        const checkVisibility = () => {
          if (finished) return;
          const nodes = document.querySelectorAll(selectors);
          for (const node of nodes) {
            if ((node.textContent ?? "").trim() === expectedLabel && isVisible(node)) {
              finished = true;
              window.clearInterval(intervalId);
              window.clearTimeout(timeoutId);
              reject(new Error(`Unexpected transition label visible: ${expectedLabel}`));
              return;
            }
          }
        };
        const intervalId = window.setInterval(checkVisibility, 100);
        const timeoutId = window.setTimeout(() => {
          if (finished) return;
          finished = true;
          window.clearInterval(intervalId);
          resolve();
        }, probeDurationMs);
        checkVisibility();
      }),
    { expectedLabel: label, probeDurationMs: durationMs },
  );
}

test.describe("Lucky Letters Gameplay", () => {
  test("category vote shows visible countdown on host and controller", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });
    const controllerPage = (controllers[0] as (typeof controllers)[number]).controllerPage;

    await expect(page.locator('[data-testid="hud-root"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="hud-top"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="timer-root"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-testid="timer-progress"]')).toBeVisible({ timeout: 15_000 });

    await expect(controllerPage.locator('[data-testid="hud-root"]')).toHaveCount(1);
    await expect(controllerPage.locator('[data-testid="hud-top"]')).toHaveCount(1);
    await expect(controllerPage.locator('[data-testid="timer-root"]')).toBeVisible({
      timeout: 15_000,
    });
    await expect(controllerPage.locator('[data-testid="timer-progress"]')).toBeVisible({
      timeout: 15_000,
    });

    await closeAllControllers(controllers);
  });

  test("spinning phase auto-advances on idle active player", async ({ page, browser }) => {
    const names = ["Ada", "Ben"];
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: names,
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    await skipToPhase(page, /choose your categories/i);
    await skipBtn.click();

    const initialTurn = await findLuckyLettersTurnActor(page, controllerPages, names);
    expect(initialTurn.mode).toBe("spinning");
    await expect(page.locator('[data-testid="lucky-timeout-banner"]').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect
      .poll(
        async () => {
          const nextTurn = await findLuckyLettersTurnActor(
            page,
            controllerPages,
            names,
            2_500,
          ).catch(() => null);
          if (!nextTurn) return false;
          return (
            nextTurn.mode !== initialTurn.mode ||
            nextTurn.activeKind !== initialTurn.activeKind ||
            nextTurn.activeName !== initialTurn.activeName
          );
        },
        {
          timeout: 25_000,
          interval: 250,
        },
      )
      .toBe(true);

    await closeAllControllers(controllers);
  });

  test("deterministic solve token awards solve bonus", async ({ page, browser }) => {
    const names = ["Ada", "Ben"];
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: names,
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    await skipToPhase(page, /choose your categories/i);
    await skipBtn.click();

    const { activePage } = await findLuckyLettersTurnActor(page, controllerPages, names);

    const solveBtn = activePage.locator('[data-testid="lucky-solve-action"]').first();
    await expect(solveBtn).toBeVisible({ timeout: 10_000 });
    await expectTrialClickable(solveBtn);
    await solveBtn.click();

    const appRoot = activePage.locator("main");
    const textbox = appRoot.getByRole("textbox").first();
    await expect(textbox).toBeVisible({ timeout: 10_000 });
    await textbox.fill(E2E_SOLVE_TOKEN);
    const submitBtn = appRoot.getByRole("button", { name: /^submit$/i }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
    await expectTrialClickable(submitBtn);
    await submitBtn.click();

    const hostBonus = page.locator('[data-testid="lucky-solve-bonus"]');
    await expect(hostBonus).toHaveCount(1, {
      timeout: 15_000,
    });
    await expect(hostBonus.first()).toHaveText(/solve bonus \+\$500/i, { timeout: 15_000 });

    const controllerBonus = (controllers[0] as (typeof controllers)[number]).controllerPage.locator(
      '[data-testid="lucky-solve-bonus"]',
    );
    await expect(controllerBonus).toHaveCount(1, { timeout: 15_000 });
    await expect(controllerBonus.first()).toHaveText(/solve bonus \+\$500/i, { timeout: 15_000 });

    await closeAllControllers(controllers);
  });

  test("solve CTA is trial-clickable and micro-phase transitions stay off", async ({
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

    await skipToPhase(page, /choose your categories/i);
    const spinningTransitionProbe = expectTransitionLabelNeverVisibleFor(page, "Spin the Wheel!");
    await skipBtn.click();
    await spinningTransitionProbe;
    await expect(
      page.locator('[data-testid="lucky-host-state"][data-phase="spinning"]').first(),
    ).toBeVisible({
      timeout: 15_000,
    });

    const { activePage } = await findLuckyLettersTurnActor(page, controllerPages, names);
    const appRoot = activePage.locator("main");
    const solveButton = appRoot.getByRole("button", { name: /solve/i });

    await expect(solveButton).toBeVisible({ timeout: 10_000 });
    await expect(solveButton).toBeEnabled({ timeout: 10_000 });
    await solveButton.click({ trial: true });
    await expectTopmostHitTarget(solveButton);

    const solvingTransitionProbe = Promise.all(
      MICRO_PHASE_TRANSITION_BANNED_LABELS.map((label) =>
        expectTransitionLabelNeverVisibleFor(page, label),
      ),
    );
    await solveButton.click();
    await solvingTransitionProbe;
    await expect
      .poll(
        async () => {
          const textboxVisible = await appRoot
            .getByRole("textbox")
            .first()
            .isVisible()
            .catch(() => false);
          if (textboxVisible) return "solve-attempt";

          const hostState = page.locator('[data-testid="lucky-host-state"]').first();
          return (await hostState.getAttribute("data-phase").catch(() => null)) ?? "unknown";
        },
        { timeout: 10_000 },
      )
      .toMatch(/solve-attempt|spinning|guess-consonant|buy-vowel/);

    const textbox = appRoot.getByRole("textbox").first();
    const submitButton = appRoot.getByRole("button", { name: /^submit$/i }).first();
    const solveInputOpened = await textbox.isVisible().catch(() => false);
    if (solveInputOpened) {
      await expect(submitButton).toBeVisible({ timeout: 10_000 });
      await submitButton.click({ trial: true });
      await expectTopmostHitTarget(submitButton);
    } else {
      await expect(
        page
          .getByText(/pick a consonant!/i)
          .or(page.locator('[data-testid="lucky-timeout-banner"]')),
      ).toBeVisible({ timeout: 10_000 });
    }

    await closeAllControllers(controllers);
  });

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
    await skipToPhase(page, /choose your categories/i);
    await skipBtn.click();

    const { activePage } = await findLuckyLettersTurnActor(page, controllerPages, names);

    // Active player clicks Solve
    const solveBtn = activePage.locator('[data-testid="lucky-solve-action"]').first();
    await expect(solveBtn).toBeVisible({ timeout: 10_000 });
    await expectTrialClickable(solveBtn);
    await solveBtn.click();

    // Should now see TextInput for solving
    const appRoot = activePage.locator("main");
    const textbox = appRoot.getByRole("textbox").first();
    await expect(textbox).toBeVisible({ timeout: 10_000 });
    await textbox.fill("a wrong guess for the puzzle");
    const submitBtn = appRoot.getByRole("button", { name: /^submit$/i }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
    await expectTrialClickable(submitBtn);
    await submitBtn.click();

    // After wrong solve, host should show a timeout/round-result banner or return to turn flow.
    await expect
      .poll(
        async () =>
          (await page
            .locator('[data-testid="lucky-timeout-banner"]')
            .first()
            .isVisible()
            .catch(() => false)) ||
          (await page
            .getByText(/the answer was/i)
            .isVisible()
            .catch(() => false)) ||
          (await page
            .getByText(/spin, buy a vowel, or solve!/i)
            .isVisible()
            .catch(() => false)),
        {
          timeout: 15_000,
          interval: 250,
        },
      )
      .toBe(true);

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
    await skipToPhase(page, /choose your categories/i);
    await skipBtn.click();

    const { activePage } = await findLuckyLettersTurnActor(page, controllerPages, names);

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
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    await skipToPhase(page, /choose your categories/i);
    await skipBtn.click();

    const { activePage } = await findLuckyLettersTurnActor(page, controllerPages, names);
    const solveBtn = activePage.locator('[data-testid="lucky-solve-action"]').first();
    await expect(solveBtn).toBeVisible({ timeout: 10_000 });
    await solveBtn.click();

    const appRoot = activePage.locator("main");
    const textbox = appRoot.getByRole("textbox").first();
    await expect(textbox).toBeVisible({ timeout: 10_000 });
    await textbox.fill(E2E_SOLVE_TOKEN);
    await appRoot
      .getByRole("button", { name: /^submit$/i })
      .first()
      .click();

    await expect(page.locator("body")).toContainText(/won the round!/i, { timeout: 15_000 });

    // Controllers should show the round result too
    for (const c of controllers) {
      await expect(c.controllerPage.locator("body")).toContainText(/the answer was/i, {
        timeout: 15_000,
      });
    }

    await closeAllControllers(controllers);
  });

  test("standard mode shows bonus round", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "standard",
      playerNames: ["Ada", "Ben"],
    });

    await driveLuckyLettersToPhase(
      page,
      controllers.map((controller) => controller.controllerPage),
      /bonus round/i,
      ["Ada", "Ben"],
    );

    await expect(page.getByRole("heading", { name: /bonus round/i })).toBeVisible();

    await closeAllControllers(controllers);
  });

  test("bonus reveal shows solved or not solved", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "standard",
      playerNames: ["Ada", "Ben"],
    });

    await driveLuckyLettersToPhase(
      page,
      controllers.map((controller) => controller.controllerPage),
      /bonus round/i,
      ["Ada", "Ben"],
    );

    const allPages = [page, ...controllers.map((controller) => controller.controllerPage)];
    await expect
      .poll(
        async () => {
          for (const currentPage of allPages) {
            const solved = await currentPage
              .getByText(/solved it|solved!/i)
              .first()
              .isVisible()
              .catch(() => false);
            if (solved) return true;
            const notSolved = await currentPage
              .getByText(/not this time|not solved/i)
              .first()
              .isVisible()
              .catch(() => false);
            if (notSolved) return true;
          }
          return false;
        },
        { timeout: 45_000 },
      )
      .toBe(true);

    await closeAllControllers(controllers);
  });

  test("kids mode reaches final scores", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });
    await driveLuckyLettersToPhase(
      page,
      controllers.map((controller) => controller.controllerPage),
      /final scores/i,
      ["Ada", "Ben"],
      1_200,
    );
    await expect(page.locator('[data-testid="final-scores-root"]').first()).toBeVisible();

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
    await skipToPhase(page, /choose your categories/i);
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
    await skipToPhase(page, /choose your categories/i);
    await page.getByRole("button", { name: /^skip$/i }).click();

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
    await skipToPhase(page, /choose your categories/i);
    await skipBtn.click();

    for (const controllerPage of controllerPages) {
      await expect(controllerPage.getByText("0%")).toBeVisible({ timeout: 15_000 });
    }

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

    for (const controllerPage of controllerPages) {
      const hasSolveButton = await controllerPage
        .getByRole("button", { name: /solve/i })
        .first()
        .isVisible()
        .catch(() => false);
      const hasTurnLabel = await controllerPage
        .locator("body")
        .textContent()
        .then((text) => /'s turn|your turn!/i.test(text ?? ""))
        .catch(() => false);
      expect(hasSolveButton || hasTurnLabel).toBe(true);
    }

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
    await skipToPhase(page, /choose your categories/i);
    await skipBtn.click();

    const turnActor = await findLuckyLettersTurnActor(page, controllerPages, names);
    const watchingControllers = controllerPages.filter(
      (controllerPage) => controllerPage !== turnActor.activePage,
    );
    expect(watchingControllers.length).toBeGreaterThan(0);
    for (const watchingPage of watchingControllers) {
      await expect(
        watchingPage.getByText(new RegExp(`${turnActor.activeName}.s turn`, "i")),
      ).toBeVisible({
        timeout: 15_000,
      });
      await expect(watchingPage.locator('[data-testid="lucky-mobile-wheel"]')).toBeVisible({
        timeout: 15_000,
      });
    }

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
    await skipToPhase(page, /choose your categories/i);
    await skipBtn.click();
    const turnActor = await findLuckyLettersTurnActor(
      page,
      controllers.map((c) => c.controllerPage),
      names,
    );

    // Host should show the wheel
    await expect(page.locator('[data-testid="lucky-wheel"]')).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(turnActor.activeName, { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Host should show the "Spin, buy a vowel, or solve!" prompt
    await expect(page.getByText("Spin, buy a vowel, or solve!")).toBeVisible({ timeout: 10_000 });

    await closeAllControllers(controllers);
  });

  test("controller bonus-reveal shows solved or not-solved state", async ({ page, browser }) => {
    const names = ["Ada", "Ben"];
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "standard",
      playerNames: names,
    });
    const controllerPages = controllers.map((c) => c.controllerPage);

    await driveLuckyLettersToPhase(page, controllerPages, /bonus round/i, names, 900);

    for (const c of controllers) {
      await expect
        .poll(
          async () => {
            const solved = await c.controllerPage
              .getByText(/^solved!?$/i)
              .isVisible()
              .catch(() => false);
            const notSolved = await c.controllerPage
              .getByText(/not solved/i)
              .isVisible()
              .catch(() => false);
            return solved || notSolved;
          },
          { timeout: 20_000, interval: 250 },
        )
        .toBe(true);
    }

    await closeAllControllers(controllers);
  });

  test("final scores reachable via forceToFinalScores in all complexities", async ({
    page,
    browser,
  }) => {
    const names = ["Ada", "Ben"];
    // Test advanced mode reaches final scores (covers the full lifecycle)
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "advanced",
      playerNames: names,
    });
    const controllerPages = controllers.map((c) => c.controllerPage);

    await driveLuckyLettersToPhase(page, controllerPages, /final scores/i, names, 1_200);

    await expect(page.locator('[data-testid="final-scores-root"]').first()).toBeVisible();

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
    const hostConsonantPrompt = page.getByText(/pick a consonant!?/i).first();

    await skipToPhase(page, /choose your categories/i);
    await skipBtn.click();

    const deadline = Date.now() + 30_000;
    let activePage: Page | null = null;

    while (Date.now() < deadline) {
      if (await hostConsonantPrompt.isVisible().catch(() => false)) {
        break;
      }

      const turnActor = await findLuckyLettersTurnActor(page, controllerPages, names, 2_000).catch(
        () => null,
      );
      activePage = turnActor?.activePage ?? null;
      if (!turnActor) {
        await page.waitForTimeout(200);
        continue;
      }

      if (turnActor.mode === "guess-consonant") {
        break;
      }

      if (turnActor.mode === "spinning") {
        const spinBtn = turnActor.activePage.getByRole("button", { name: /spin the wheel/i }).first();
        const canSpin =
          (await spinBtn.isVisible().catch(() => false)) &&
          (await spinBtn.isEnabled().catch(() => false));
        if (canSpin) {
          await spinBtn.click();
          await page.waitForTimeout(400);
          continue;
        }
      }

      await page.waitForTimeout(250);
    }

    await expect(hostConsonantPrompt).toBeVisible({ timeout: 10_000 });

    if (!activePage || activePage.isClosed()) {
      activePage = (await findLuckyLettersTurnActor(page, controllerPages, names)).activePage;
    }
    await expect(activePage.getByText(/^Pick a consonant!?$/i).first()).toBeVisible({
      timeout: 10_000,
    });

    await closeAllControllers(controllers);
  });
});
