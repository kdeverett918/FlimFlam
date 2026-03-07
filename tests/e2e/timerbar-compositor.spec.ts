import { type Page, expect, test } from "@playwright/test";

import { closeAllControllers, driveBrainBoardToPhase, startGame } from "./e2e-helpers";

type TimerSnapshot = {
  computedWidth: number;
  boundingWidth: number;
  sampledAt: number;
};

async function readTimerSnapshot(page: Page): Promise<TimerSnapshot | null> {
  return page.evaluate(() => {
    const progress = document.querySelector('[data-testid="timer-progress"]');
    if (!(progress instanceof HTMLElement)) return null;

    const computedWidth = Number.parseFloat(window.getComputedStyle(progress).width);
    const boundingWidth = progress.getBoundingClientRect().width;

    if (!Number.isFinite(computedWidth) || !Number.isFinite(boundingWidth)) {
      return null;
    }

    return {
      computedWidth,
      boundingWidth,
      sampledAt: Date.now(),
    };
  });
}

test.describe("TimerBar Compositor Contract", () => {
  test.describe.configure({ timeout: 180_000 });

  test("brain board answering timer uses transform animation without layout width churn", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      await driveBrainBoardToPhase(page, controllerPages, /everyone is answering/i, 900);

      await expect(page.locator('[data-testid="timer-root"]')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('[data-testid="timer-progress"]')).toBeVisible({ timeout: 20_000 });

      const first = await readTimerSnapshot(page);
      expect(first).not.toBeNull();
      if (!first) return;

      await expect
        .poll(
          async () => {
            const next = await readTimerSnapshot(page);
            if (!next) return false;

            const elapsed = next.sampledAt - first.sampledAt;
            if (elapsed < 250) return false;

            const computedDelta = Math.abs(next.computedWidth - first.computedWidth);
            const boundingDelta = Math.abs(next.boundingWidth - first.boundingWidth);

            return computedDelta <= 1 && boundingDelta > 1;
          },
          { timeout: 10_000, interval: 200 },
        )
        .toBe(true);
    } finally {
      await closeAllControllers(controllers);
    }
  });
});
