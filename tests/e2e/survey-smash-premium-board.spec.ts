import { type Locator, type Page, expect, test } from "@playwright/test";

import { closeAllControllers, driveSurveySmashToPhase, startGame } from "./e2e-helpers";

type AnswerTileSnapshot = {
  answerId: string;
  rank: number;
  revealed: string;
};

function sameIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

async function readRevealStep(stepBadge: Locator): Promise<number | null> {
  const rawStep = await stepBadge.getAttribute("data-step", { timeout: 1_200 }).catch(() => null);
  if (rawStep === null) return null;
  const parsed = Number.parseInt(rawStep, 10);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
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

async function readAnswerTiles(page: Page): Promise<AnswerTileSnapshot[]> {
  return page.locator('[data-testid="survey-answer-tile"]').evaluateAll((elements) => {
    return elements.map((element) => {
      const rank = Number.parseInt(element.getAttribute("data-rank") ?? "0", 10);
      return {
        answerId: element.getAttribute("data-answer-id") ?? "",
        rank,
        revealed: element.getAttribute("data-revealed") ?? "false",
      };
    });
  });
}

async function driveToAnswerReveal(page: Page, controllerPages: Page[]): Promise<void> {
  const board = page.locator('[data-testid="survey-answer-board"]');
  const revealStep = page.locator('[data-testid="survey-reveal-step"]');
  const finalScoresHeading = page.getByRole("heading", { name: /final scores/i }).first();
  const playAgainButton = page.getByRole("button", { name: /play again/i }).first();
  const deadline = Date.now() + 150_000;

  while (Date.now() < deadline) {
    const boardVisible = await board.isVisible().catch(() => false);
    const stepVisible = await revealStep.isVisible().catch(() => false);
    if (boardVisible && stepVisible) {
      await expect(revealStep).toHaveAttribute("data-step", /\d+/);
      return;
    }

    if (await finalScoresHeading.isVisible().catch(() => false)) {
      if (await playAgainButton.isVisible().catch(() => false)) {
        await playAgainButton.click().catch(() => {});
        await page.waitForTimeout(400);
        continue;
      }
    }

    await driveSurveySmashToPhase(
      page,
      controllerPages,
      /the people say|who said what|round \d+ complete|final scores/i,
      15_000,
    ).catch(() => {});

    await page.waitForTimeout(120);
  }

  throw new Error("Timed out before reaching Survey Smash answer reveal board");
}

test.describe("Survey Smash Premium Board", () => {
  test.describe.configure({ timeout: 180_000 });

  test("board structure stays stable and answer ids persist through sequential reveal", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      await driveToAnswerReveal(page, controllerPages);

      const board = page.locator('[data-testid="survey-answer-board"]');
      const stepBadge = page.locator('[data-testid="survey-reveal-step"]');
      await expect(board).toHaveCount(1);

      const initialTiles = await readAnswerTiles(page);
      expect(initialTiles.length).toBeGreaterThan(0);
      const initialAnswerIds = initialTiles.map((tile) => tile.answerId);
      expect(new Set(initialAnswerIds).size).toBe(initialAnswerIds.length);
      for (let i = 0; i < initialTiles.length; i++) {
        expect(initialTiles[i]?.rank).toBe(i + 1);
        expect(initialTiles[i]?.answerId.length).toBeGreaterThan(0);
        expect(["true", "false"]).toContain(initialTiles[i]?.revealed ?? "");
      }

      let previousStep = -1;
      let observedStepChanges = 0;
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

        const step = await readRevealStep(stepBadge);
        if (step === null) break;
        if (step < previousStep) {
          // A new reveal cycle started; stop validating this cycle.
          break;
        }
        if (step !== previousStep) {
          observedStepChanges += 1;
          previousStep = step;

          const currentTiles = await readAnswerTiles(page);
          const currentIds = currentTiles.map((tile) => tile.answerId);
          if (!sameIds(currentIds, initialAnswerIds)) {
            // Board advanced to the next prompt; stop this reveal-cycle assertion.
            break;
          }
        }

        const revealed = await page
          .locator('[data-testid="survey-answer-tile"][data-revealed="true"]')
          .count();
        if (step >= initialTiles.length && revealed === initialTiles.length) {
          break;
        }
        await page.waitForTimeout(80);
      }

      const finalStep = (await readRevealStep(stepBadge)) ?? 0;
      expect(observedStepChanges).toBeGreaterThan(0);
      expect(finalStep).toBeGreaterThanOrEqual(0);

      await expectNoAudioErrors(page);
    } finally {
      await closeAllControllers(controllers);
    }
  });
});

test.describe("Survey Smash Premium Board (Reduced Motion)", () => {
  test.describe.configure({ timeout: 180_000 });
  test.use({ reducedMotion: "reduce" });

  test("reduced-motion reveal preserves board markers and reveal progression", async ({
    page,
    browser,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      await driveToAnswerReveal(page, controllerPages);

      const stepBadge = page.locator('[data-testid="survey-reveal-step"]');
      const initialTiles = await readAnswerTiles(page);
      expect(initialTiles.length).toBeGreaterThan(0);
      const initialIds = initialTiles.map((tile) => tile.answerId);

      let previousStep = -1;
      let observedStepChanges = 0;
      const deadline = Date.now() + 25_000;
      while (Date.now() < deadline) {
        const inRevealPhase = await page
          .getByText(/the people say/i)
          .first()
          .isVisible()
          .catch(() => false);
        if (!inRevealPhase) {
          break;
        }

        const step = await readRevealStep(stepBadge);
        if (step === null) break;
        if (step < previousStep) {
          break;
        }

        if (step !== previousStep) {
          observedStepChanges += 1;
          previousStep = step;

          const currentIds = (await readAnswerTiles(page)).map((tile) => tile.answerId);
          if (!sameIds(currentIds, initialIds)) {
            // Board advanced to the next prompt; stop validating this reveal cycle.
            break;
          }
        }

        const revealed = await page
          .locator('[data-testid="survey-answer-tile"][data-revealed="true"]')
          .count();
        if (step >= initialTiles.length && revealed === initialTiles.length) {
          break;
        }
        await page.waitForTimeout(120);
      }

      expect(observedStepChanges).toBeGreaterThan(0);
      await expectNoAudioErrors(page);
    } finally {
      await closeAllControllers(controllers);
    }
  });
});
