import { type Page, expect, test } from "@playwright/test";

import {
  closeAllControllers,
  findBrainBoardSelectorController,
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

async function findEngagedBrainBoardWatcher(
  controllerPages: Page[],
  selector?: Page | null,
  timeoutMs = 15_000,
): Promise<Page> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const controllerPage of controllerPages) {
      if (selector && controllerPage === selector) continue;
      const hasContextCard = await controllerPage
        .locator('[data-testid="controller-context-card"]')
        .isVisible()
        .catch(() => false);
      const hasGrid = await controllerPage
        .locator('[data-testid="brain-board-grid"]')
        .isVisible()
        .catch(() => false);
      if (hasContextCard || hasGrid) {
        return controllerPage;
      }
    }
    await controllerPages[0]?.waitForTimeout(150);
  }
  throw new Error("Expected at least one non-selector watcher controller");
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

function extractKnownName(text: string, knownNames: string[]): string | null {
  const lower = text.toLowerCase();
  return knownNames.find((name) => lower.includes(name.toLowerCase())) ?? null;
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
      await page.getByRole("button", { name: /^skip$/i }).click();
      await skipToPhase(page, /'s pick/i, 30).catch(() => {});
      const selector = await findBrainBoardSelectorController(controllerPages, 35_000).catch(
        () => null,
      );
      const watcher = await findEngagedBrainBoardWatcher(controllerPages, selector, 20_000);

      await expect(watcher.locator('[data-testid="controller-context-card"]')).toBeVisible({
        timeout: 10_000,
      });
      await expect(watcher.locator('[data-testid="brain-board-grid"]')).toBeVisible({
        timeout: 10_000,
      });

      await expectNoAudioErrors(page);
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("leaderboard updates after score change and results are visible on host + controller", async ({
    page,
    browser,
  }) => {
    const names = ["Alpha", "Beta", "Gamma"];
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "standard",
      playerNames: names,
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

      const selector = await findBrainBoardSelectorController(controllerPages, 20_000);
      await selector.locator('button[aria-label*=" for "]:enabled').first().click();
      await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });
      const answeringController = await findControllerWithVisibleTextbox(controllerPages, 20_000);
      const answererIndex = controllerPages.findIndex(
        (controllerPage) => controllerPage === answeringController,
      );
      if (answererIndex < 0) {
        throw new Error("Could not map answering controller page to player index");
      }
      const answererName = names[answererIndex] ?? "";
      if (!answererName) {
        throw new Error("Could not resolve answering player name");
      }
      await submitTextAnswer(answeringController, "definitely wrong brain board polish answer");

      await expect(page.getByText(/correct answer/i)).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(answererName, { exact: true })).toBeVisible({ timeout: 15_000 });
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

      const selectorBefore = beforeRows.find(
        (row) => extractKnownName(row.text, [answererName]) === answererName,
      );
      const selectorAfter = afterRows.find(
        (row) => extractKnownName(row.text, [answererName]) === answererName,
      );
      expect(selectorBefore).toBeDefined();
      expect(selectorAfter).toBeDefined();
      expect(selectorAfter?.score).not.toBe(selectorBefore?.score);

      await expectNoAudioErrors(page);
    } finally {
      await closeAllControllers(controllers);
    }
  });
});
