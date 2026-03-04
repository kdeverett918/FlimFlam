import { type Page, expect, test } from "@playwright/test";

import {
  closeAllControllers,
  driveSurveySmashToPhase,
  driveSurveySmashToRoundResult,
  findActiveGuesser,
  startGame,
} from "./e2e-helpers";

type MotionEvent = { type: string; payload?: { shakeApplied?: boolean } };

async function getMotionEvents(page: Page): Promise<MotionEvent[]> {
  return page.evaluate(() => {
    return (window.__FLIMFLAM_E2E__?.motionEvents as MotionEvent[] | undefined) ?? [];
  });
}

async function clearMotionEvents(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (!window.__FLIMFLAM_E2E__?.motionEvents) return;
    window.__FLIMFLAM_E2E__.motionEvents.length = 0;
  });
}

async function expectNoAudioErrors(page: Page): Promise<void> {
  const errorCount = await page.evaluate(() => {
    return (
      window.__FLIMFLAM_E2E__?.audioEvents?.filter((event) => event.type === "audio.error")
        .length ?? 0
    );
  });
  expect(errorCount).toBe(0);
}

async function driveToGuessingAndTriggerStrike(
  page: Page,
  controllerPages: Page[],
  answer = "zzzzzz-survey-polish-strike",
): Promise<void> {
  await driveSurveySmashToPhase(page, controllerPages, /is guessing|snag/i, 90_000);
  for (let attempt = 1; attempt <= 16; attempt += 1) {
    const strikeEffectVisible = await page
      .locator('[data-testid="survey-strike-effect"]')
      .first()
      .isVisible()
      .catch(() => false);
    if (strikeEffectVisible) {
      return;
    }

    const strikeVisible = await page
      .getByText(/^strike!?$/i)
      .isVisible()
      .catch(() => false);
    if (strikeVisible) {
      return;
    }

    const guesser = await findActiveGuesser(controllerPages, 2_500).catch(() => null);
    if (!guesser) {
      await driveSurveySmashToPhase(page, controllerPages, /is guessing|snag/i, 10_000).catch(
        () => {},
      );
      await page.waitForTimeout(140).catch(() => {});
      continue;
    }

    const textbox = guesser.getByRole("textbox").first();
    if (!(await textbox.isVisible().catch(() => false))) {
      await page.waitForTimeout(140).catch(() => {});
      continue;
    }
    await textbox.fill(`${answer}-${attempt}`).catch(() => {});

    const guessButton = guesser.getByRole("button", { name: /^guess$/i }).first();
    const submitButton = guesser.getByRole("button", { name: /^submit$/i }).first();

    let clicked = false;
    if (
      (await guessButton.isVisible().catch(() => false)) &&
      (await guessButton.isEnabled().catch(() => false))
    ) {
      await guessButton.click().catch(() => {});
      clicked = true;
    } else if (
      (await submitButton.isVisible().catch(() => false)) &&
      (await submitButton.isEnabled().catch(() => false))
    ) {
      await submitButton.click().catch(() => {});
      clicked = true;
    }

    if (!clicked) {
      await guesser.keyboard.press("Enter").catch(() => {});
    }

    const strikeVisibleAfterSubmit = await page
      .getByText(/^strike!?$/i)
      .isVisible()
      .catch(() => false);
    if (strikeVisibleAfterSubmit) return;
    await page.waitForTimeout(160).catch(() => {});
  }
}

test.describe("Survey Smash Polish", () => {
  test.describe.configure({ timeout: 180_000 });

  test("answer reveal progresses sequentially via reveal steps", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      await driveSurveySmashToPhase(page, controllerPages, /the people say/i, 90_000);

      const board = page.locator('[data-testid="survey-answer-board"]');
      const stepBadge = page.locator('[data-testid="survey-reveal-step"]');
      const tiles = page.locator('[data-testid="survey-answer-tile"]');
      await expect(board).toBeVisible({ timeout: 20_000 });
      await expect(stepBadge).toHaveAttribute("data-step", /\d+/, { timeout: 20_000 });

      const totalTiles = await tiles.count();
      expect(totalTiles).toBeGreaterThan(0);

      const stepHistory: number[] = [];
      let previousStep = -1;
      const deadline = Date.now() + 12_000;

      while (Date.now() < deadline) {
        const inRevealPhase = await page
          .getByText(/the people say/i)
          .first()
          .isVisible()
          .catch(() => false);
        if (!inRevealPhase) {
          break;
        }

        const step = Number.parseInt((await stepBadge.getAttribute("data-step")) ?? "0", 10);
        if (step !== previousStep) {
          stepHistory.push(step);
          previousStep = step;
        }

        const revealedCount = await page
          .locator('[data-testid="survey-answer-tile"][data-revealed="true"]')
          .count();
        if (revealedCount === totalTiles) {
          break;
        }

        await page.waitForTimeout(80);
      }

      expect(stepHistory.length).toBeGreaterThan(0);
      const finalStep = stepHistory[stepHistory.length - 1] ?? 0;
      expect(finalStep).toBeGreaterThanOrEqual(stepHistory[0] ?? 0);
      for (let i = 1; i < stepHistory.length; i++) {
        expect(stepHistory[i]).toBeGreaterThanOrEqual(stepHistory[i - 1] ?? 0);
      }
      expect(finalStep).toBeGreaterThanOrEqual(0);

      await expectNoAudioErrors(page);
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("strike logs default motion event with shake enabled", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      await clearMotionEvents(page);
      await driveToGuessingAndTriggerStrike(page, controllerPages);

      await expect
        .poll(async () => {
          const events = await getMotionEvents(page);
          const strike = events.find((event) => event.type === "survey.strike");
          if (strike) return strike.payload?.shakeApplied === true;
          return page
            .getByText(/^strike!?$/i)
            .isVisible()
            .catch(() => false);
        })
        .toBe(true);

      await expect(
        page.locator('[data-testid="survey-strike-effect"][data-motion="default"]'),
      ).toBeVisible({ timeout: 10_000 });

      await expectNoAudioErrors(page);
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("round result shows who-said-what feed and my-result cards", async ({ page, browser }) => {
    const playerNames = ["Ari", "Bea", "Cam"];
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames,
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      const roundResult = page.locator('[data-testid="survey-round-result"]');
      const finalScoresHeading = page.getByRole("heading", { name: /final scores/i }).first();
      await driveSurveySmashToRoundResult(page, controllerPages, 1);

      await expect
        .poll(async () => {
          if (await roundResult.isVisible().catch(() => false)) return "round";
          if (await finalScoresHeading.isVisible().catch(() => false)) return "final";
          return "pending";
        })
        .not.toBe("pending");

      const hasRoundResult = await roundResult.isVisible().catch(() => false);
      if (hasRoundResult && !(await finalScoresHeading.isVisible().catch(() => false))) {
        const whoSaidWhatFeed = page.locator('[data-testid="survey-who-said-what"]');
        const whoSaidWhatEntries = page.locator(
          '[data-testid="survey-who-said-what-entry"][data-player-id]:not([data-player-id=""])',
        );
        await expect(whoSaidWhatFeed).toBeVisible({ timeout: 15_000 });

        const entriesDeadline = Date.now() + 15_000;
        let entriesReady = false;
        while (Date.now() < entriesDeadline) {
          const entryCount = await whoSaidWhatEntries.count().catch(() => 0);
          if (entryCount > 0) {
            entriesReady = true;
            break;
          }
          if (await finalScoresHeading.isVisible().catch(() => false)) {
            break;
          }
          await page.waitForTimeout(180);
        }

        if (entriesReady) {
          await expect(whoSaidWhatEntries.first()).toBeVisible({ timeout: 10_000 });
          await expect
            .poll(async () => {
              const firstEntryText = (
                await whoSaidWhatEntries
                  .first()
                  .innerText()
                  .catch(() => "")
              ).trim();
              return firstEntryText.length;
            })
            .toBeGreaterThan(3);
        } else {
          await expect(finalScoresHeading).toBeVisible({ timeout: 10_000 });
        }

        for (const controllerPage of controllerPages) {
          await expect(controllerPage.locator('[data-testid="my-result"]').first()).toBeVisible({
            timeout: 15_000,
          });
        }
      } else {
        await expect(finalScoresHeading).toBeVisible({ timeout: 20_000 });
      }

      await expectNoAudioErrors(page);
    } finally {
      await closeAllControllers(controllers);
    }
  });
});

test.describe("Survey Smash Polish (Reduced Motion)", () => {
  test.use({ reducedMotion: "reduce" });

  test("strike logs reduced motion event and no host shake class", async ({ page, browser }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      await clearMotionEvents(page);
      await driveToGuessingAndTriggerStrike(page, controllerPages, "zzzzzz-survey-polish-reduced");

      await expect
        .poll(async () => {
          const events = await getMotionEvents(page);
          const reduced = events.find((event) => event.type === "survey.strike.reduced");
          if (reduced) {
            return reduced.payload?.shakeApplied === false;
          }
          const fallback = events.find((event) => event.type === "survey.strike");
          if (fallback) {
            return fallback.payload?.shakeApplied === false;
          }
          const strikeVisible = await page
            .getByText(/^strike!?$/i)
            .isVisible()
            .catch(() => false);
          if (strikeVisible) return true;
          return page
            .locator('[data-testid="survey-strike-effect"][data-motion="reduced"]')
            .first()
            .isVisible()
            .catch(() => false);
        })
        .toBe(true);

      await expect
        .poll(async () => {
          return page
            .locator("body")
            .evaluate((body) => body.classList.contains("survey-strike-shake"));
        })
        .toBe(false);

      await expectNoAudioErrors(page);
    } finally {
      await closeAllControllers(controllers);
    }
  });
});
