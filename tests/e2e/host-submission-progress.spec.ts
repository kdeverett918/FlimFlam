import { expect, test } from "@playwright/test";

import {
  findBrainBoardSelectorController,
  findFaceOffPlayers,
  startGame,
  submitTextAnswer,
} from "./e2e-helpers";

function parseSubmittedProgress(text: string | null): { submitted: number; total: number } {
  const match = text?.match(/(\d+)\s*\/\s*(\d+)\s*submitted/i);
  return {
    submitted: Number.parseInt(match?.[1] ?? "0", 10),
    total: Number.parseInt(match?.[2] ?? "0", 10),
  };
}

async function readSubmittedProgressText(hostPage: import("@playwright/test").Page) {
  const text = await hostPage.locator('[data-testid="submission-progress"]').textContent();
  return parseSubmittedProgress(text);
}

async function tryReadSubmittedProgress(
  hostPage: import("@playwright/test").Page,
): Promise<{ submitted: number; total: number } | null> {
  const progress = hostPage.locator('[data-testid="submission-progress"]').first();
  const visible = await progress.isVisible().catch(() => false);
  if (!visible) return null;
  const text = await progress.textContent().catch(() => null);
  return parseSubmittedProgress(text);
}

async function expectNoAudioErrors(hostPage: import("@playwright/test").Page) {
  const errorCount = await hostPage.evaluate(() => {
    return (
      window.__FLIMFLAM_E2E__?.audioEvents?.filter((event) => event.type === "audio.error")
        .length ?? 0
    );
  });
  expect(errorCount).toBe(0);
}

test.describe("Host Submission Progress", () => {
  test("survey smash face-off progress increments and excludes disconnected players", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });
    const controllerPages = controllers.map((controller) => controller.controllerPage);
    const skipButton = page.getByRole("button", { name: /^skip$/i });

    await skipButton.click();
    await expect(page.locator('[data-testid="submission-progress"]')).toBeVisible({
      timeout: 15_000,
    });

    const initial = await readSubmittedProgressText(page);
    expect(initial.total).toBeGreaterThan(0);

    const faceOffControllers = await findFaceOffPlayers(controllerPages, 2, 20_000);
    const disconnectedController = faceOffControllers[1];
    const disconnectedContext = controllers.find(
      (controller) => controller.controllerPage === disconnectedController,
    )?.context;
    await disconnectedContext?.close();

    await expect(page.locator('[data-player-id][data-status="disconnected"]').first()).toBeVisible({
      timeout: 20_000,
    });
    const afterDisconnect = await readSubmittedProgressText(page);

    await submitTextAnswer(faceOffControllers[0], "survey-progress-increment");

    await expect
      .poll(
        async () => {
          const progress = await tryReadSubmittedProgress(page);
          if (!progress) return true;
          return progress.submitted >= afterDisconnect.submitted + 1;
        },
        { timeout: 15_000 },
      )
      .toBe(true);
    await expect
      .poll(
        async () => {
          const progress = await tryReadSubmittedProgress(page);
          if (!progress) return true;
          return progress.submitted === progress.total;
        },
        { timeout: 20_000 },
      )
      .toBe(true);

    await expectNoAudioErrors(page);
    for (const controller of controllers) {
      await controller.context.close().catch(() => {});
    }
  });

  test("brain board answering progress updates and completes with disconnect handling", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta", "Gamma"],
    });
    const controllerPages = controllers.map((controller) => controller.controllerPage);
    const skipButton = page.getByRole("button", { name: /^skip$/i });

    await skipButton.click();
    const selector = await findBrainBoardSelectorController(controllerPages, 20_000);
    await selector.locator('button[aria-label*=" for "]:enabled').first().click();

    await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-testid="submission-progress"]')).toBeVisible({
      timeout: 15_000,
    });

    const selectorController = controllers.find(
      (controller) => controller.controllerPage === selector,
    );
    if (!selectorController) {
      throw new Error("Could not map selector page to controller context");
    }

    const disconnectedController = controllers.find(
      (controller) => controller.controllerPage !== selector,
    );
    await disconnectedController?.context.close();

    await expect(page.locator('[data-player-id][data-status="disconnected"]').first()).toBeVisible({
      timeout: 20_000,
    });

    await submitTextAnswer(selector, "brain-board-progress-only-answerer");

    await expect
      .poll(
        async () => {
          const progress = await tryReadSubmittedProgress(page);
          if (!progress) return true;
          return progress.submitted === progress.total;
        },
        { timeout: 20_000 },
      )
      .toBe(true);

    await expectNoAudioErrors(page);
    for (const controller of controllers) {
      await controller.context.close().catch(() => {});
    }
  });
});
