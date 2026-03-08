import { type Page, expect, test } from "@playwright/test";

import {
  closeAllControllers,
  driveBrainBoardToClueSelect,
  findBrainBoardSelector,
  skipToPhase,
  startGame,
  submitTextAnswer,
} from "./e2e-helpers";

type LeaderboardRow = {
  playerId: string;
  score: number;
  text: string;
};

async function findControllerWithVisibleTextbox(
  controllerPages: Page[],
  timeoutMs = 20_000,
): Promise<Page> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const controllerPage of controllerPages) {
      const textbox = controllerPage.getByRole("textbox").first();
      if (await textbox.isVisible().catch(() => false)) {
        return controllerPage;
      }
    }
    await controllerPages[0]?.waitForTimeout(150);
  }
  throw new Error("Timed out waiting for Brain Board answering controller");
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

async function readLeaderboardRows(page: Page): Promise<LeaderboardRow[]> {
  return page.locator('[data-testid="leaderboard-row"]').evaluateAll((elements) => {
    return elements.map((element) => ({
      playerId: element.getAttribute("data-player-id") ?? "",
      score: Number.parseInt(element.getAttribute("data-score") ?? "0", 10),
      text: (element.textContent ?? "").trim(),
    }));
  });
}

test.describe("Brain Board Polish", () => {
  test("non-selector controllers stay engaged during category and clue-select phases", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta", "Gamma"],
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      await driveBrainBoardToClueSelect(page, controllerPages, 35_000);
      const selector = await findBrainBoardSelector(page, controllerPages, 20_000);
      const watcher =
        controllerPages.find((controllerPage) => controllerPage !== selector) ?? controllerPages[0];
      if (!watcher) {
        throw new Error("Expected at least one controller page for Brain Board");
      }

      await expect(watcher.locator('[data-testid="brain-board-grid"]')).toBeVisible({
        timeout: 10_000,
      });
      await expect
        .poll(
          async () => {
            const hasContextCard = await watcher
              .locator('[data-testid="controller-context-card"]')
              .first()
              .isVisible()
              .catch(() => false);
            if (hasContextCard) return true;
            const hasWatcherCopy = await watcher
              .getByText(/pick in progress|waiting for|'s pick/i)
              .first()
              .isVisible()
              .catch(() => false);
            return hasWatcherCopy;
          },
          { timeout: 10_000 },
        )
        .toBe(true);

      await expectNoAudioErrors(page);
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("leaderboard updates after score change and results are visible on host + controller", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "standard",
      playerNames: ["Alpha", "Beta", "Gamma"],
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      const skipButton = page.getByRole("button", { name: /^skip$/i });
      await skipButton.click();

      await expect(page.locator('[data-testid="leaderboard-row"]').first()).toBeVisible({
        timeout: 15_000,
      });
      const beforeRows = await readLeaderboardRows(page);
      expect(beforeRows.length).toBeGreaterThan(1);

      const selector = await findBrainBoardSelector(page, controllerPages, 20_000);
      await selector.locator('button[aria-label*=" for "]:enabled').first().click();
      await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });
      const answeringController = await findControllerWithVisibleTextbox(controllerPages, 20_000);
      await submitTextAnswer(answeringController, "definitely wrong brain board polish answer");
      await skipButton.click();

      await expect(page.getByText(/correct answer/i)).toBeVisible({ timeout: 20_000 });
      await expect(answeringController.locator('[data-testid="my-result"]')).toBeVisible({
        timeout: 20_000,
      });

      await skipToPhase(page, /'s pick/i, 15);
      await expect(page.locator('[data-testid="leaderboard-row"]').first()).toBeVisible({
        timeout: 15_000,
      });

      const afterRows = await readLeaderboardRows(page);
      const beforeScores = new Map(beforeRows.map((row) => [row.playerId, row.score]));

      const scoreChanged = afterRows.some(
        (row) => row.score !== (beforeScores.get(row.playerId) ?? 0),
      );
      expect(scoreChanged).toBe(true);

      await expectNoAudioErrors(page);
    } finally {
      await closeAllControllers(controllers);
    }
  });
});
