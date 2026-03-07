import { type Page, expect, test } from "@playwright/test";

import {
  closeAllControllers,
  driveSurveySmashToPhase,
  findActiveGuesser,
  findBrainBoardSelectorController,
  skipToPhase,
  startGame,
  submitTextAnswer,
} from "./e2e-helpers";

async function getMotionEvents(page: Page): Promise<Array<{ type: string; payload?: unknown }>> {
  return page.evaluate(() => {
    return (
      window.__FLIMFLAM_E2E__?.motionEvents?.map((event) => ({
        type: String(event.type),
        payload: event.payload,
      })) ?? []
    );
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

test.describe("Reduced Motion Polish", () => {
  // @ts-expect-error reducedMotion is a valid Playwright option
  test.use({ reducedMotion: "reduce" });

  test("survey strike uses reduced marker and no shake class", async ({ page, browser }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });
    const controllerPages = controllers.map((controller) => controller.controllerPage);
    await clearMotionEvents(page);
    await driveSurveySmashToPhase(page, controllerPages, /is guessing|snag/i, 90_000);

    const guesser = await findActiveGuesser(controllerPages, 20_000);
    await submitTextAnswer(guesser, "zzzzzzzzzz");

    await expect
      .poll(async () => {
        const events = await getMotionEvents(page);
        const reducedStrike = events.find((event) => event.type === "survey.strike.reduced");
        if (reducedStrike && typeof reducedStrike.payload === "object" && reducedStrike.payload) {
          const payload = reducedStrike.payload as { shakeApplied?: boolean };
          return payload.shakeApplied === false;
        }

        const fallbackStrike = events.find((event) => event.type === "survey.strike");
        if (
          fallbackStrike &&
          typeof fallbackStrike.payload === "object" &&
          fallbackStrike.payload
        ) {
          const payload = fallbackStrike.payload as { shakeApplied?: boolean };
          return payload.shakeApplied === false;
        }

        return false;
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
    await closeAllControllers(controllers);
  });

  test("lucky letters tiles use fade reveal style in reduced motion", async ({ page, browser }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Alice", "Bob"],
    });
    const skipButton = page.getByRole("button", { name: /^skip$/i });

    await skipToPhase(page, /choose your categories/i);
    await skipButton.click();
    const anyTile = page.locator('[data-testid="lucky-letter-tile"]').first();
    for (let i = 0; i < 8; i++) {
      if (await anyTile.isVisible().catch(() => false)) break;
      if (await skipButton.isVisible().catch(() => false)) {
        await skipButton.click().catch(() => {});
      }
      await page.waitForTimeout(120);
    }

    await expect(
      page.locator('[data-testid="lucky-letter-tile"][data-reveal-style="fade"]').first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('[data-testid="lucky-letter-tile"][data-reveal-style="flip"]'),
    ).toHaveCount(0);

    await expectNoAudioErrors(page);
    await closeAllControllers(controllers);
  });

  test("brain board leaderboard rows expose reduced-motion final scores", async ({
    page,
    browser,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "standard",
      playerNames: ["Alpha", "Beta"],
    });
    const controllerPages = controllers.map((controller) => controller.controllerPage);
    const skipButton = page.getByRole("button", { name: /^skip$/i });

    await skipButton.click();
    const beforeRows = page.locator('[data-testid="leaderboard-row"]');
    await expect(beforeRows.first()).toBeVisible({ timeout: 15_000 });
    const beforeScores = await beforeRows.evaluateAll((elements) =>
      elements.map((element) => Number(element.getAttribute("data-score") ?? "NaN")),
    );

    const selector = await findBrainBoardSelectorController(controllerPages, 20_000);
    const firstClue = selector.locator('button[aria-label*=" for "]:enabled').first();
    await expect(firstClue).toBeVisible({ timeout: 15_000 });
    await firstClue.click();

    await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });
    let submitted = false;
    try {
      await submitTextAnswer(selector, "definitely wrong alpha");
      submitted = true;
    } catch {
      await skipButton.click();
    }

    await expect(page.getByText(/correct answer/i)).toBeVisible({ timeout: 20_000 });
    await skipToPhase(page, /'s pick/i, 10);

    const rows = page.locator('[data-testid="leaderboard-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    const scores = await rows.evaluateAll((elements) =>
      elements.map((element) => Number(element.getAttribute("data-score") ?? "NaN")),
    );
    const scoreChanged = scores.some(
      (score, index) => score !== (beforeScores[index] ?? Number.NaN),
    );

    expect(scores.length).toBeGreaterThan(0);
    for (const score of scores) {
      expect(Number.isFinite(score)).toBe(true);
    }
    if (submitted) {
      expect(scoreChanged).toBe(true);
    }
    expect(scores).toEqual([...scores].sort((left, right) => right - left));

    await expectNoAudioErrors(page);
    await closeAllControllers(controllers);
  });
});
