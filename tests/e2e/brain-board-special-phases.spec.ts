import { type Page, expect, test } from "@playwright/test";

import type { JeopardyBoard, JeopardyClue } from "../../games/brain-board/src/content/clue-bank";
import { KIDS_BOARDS } from "../../games/brain-board/src/content/clue-bank";
import {
  closeAllControllers,
  driveBrainBoardToClueSelect,
  driveBrainBoardToFinalScores,
  findBrainBoardSelector,
  startGame,
  submitTextAnswer,
} from "./e2e-helpers";

const BRAIN_BOARD_HOST_STATE = '[data-testid="brain-board-host-state"]';
const BRAIN_BOARD_CLUE_SELECTOR = 'button[aria-label*=" for "]:enabled';

async function readBrainBoardHostPhase(hostPage: Page): Promise<string | null> {
  return hostPage.locator(BRAIN_BOARD_HOST_STATE).first().getAttribute("data-phase");
}

async function waitForBrainBoardHostPhase(
  hostPage: Page,
  expectedPhase: string,
  timeoutMs = 30_000,
): Promise<void> {
  await expect
    .poll(() => readBrainBoardHostPhase(hostPage), { timeout: timeoutMs })
    .toBe(expectedPhase);
}

async function waitForAnyBrainBoardHostPhase(
  hostPage: Page,
  expectedPhases: string[],
  timeoutMs = 30_000,
): Promise<string> {
  let resolvedPhase = "";
  await expect
    .poll(
      async () => {
        const currentPhase = await readBrainBoardHostPhase(hostPage);
        if (currentPhase && expectedPhases.includes(currentPhase)) {
          resolvedPhase = currentPhase;
          return currentPhase;
        }
        return null;
      },
      {
        timeout: timeoutMs,
      },
    )
    .not.toBeNull();
  return resolvedPhase;
}

async function clickSkip(hostPage: Page, timeoutMs = 15_000): Promise<void> {
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });
  await expect(skipButton).toBeVisible({ timeout: timeoutMs });
  await skipButton.click();
}

async function driveBrainBoardToHostPhase(
  hostPage: Page,
  targetPhase: string,
  timeoutMs = 240_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });

  while (Date.now() < deadline) {
    const currentPhase = await readBrainBoardHostPhase(hostPage);
    if (currentPhase === targetPhase) {
      return;
    }
    if (currentPhase === "final-scores" && targetPhase !== "final-scores") {
      throw new Error(`Brain Board advanced to final-scores before reaching ${targetPhase}`);
    }

    const canSkip = await skipButton.isVisible().catch(() => false);
    if (!canSkip) {
      await hostPage.waitForTimeout(250);
      continue;
    }

    await skipButton.click().catch(() => {});
    await expect
      .poll(() => readBrainBoardHostPhase(hostPage), { timeout: 5_000 })
      .not.toBe(currentPhase);
  }

  throw new Error(`Timed out driving Brain Board host to phase: ${targetPhase}`);
}

async function findPagesWithVisibleButton(
  pages: Page[],
  name: RegExp,
  timeoutMs = 10_000,
): Promise<Page[]> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const matchingPages: Page[] = [];
    for (const page of pages) {
      const button = page.getByRole("button", { name }).first();
      if (await button.isVisible().catch(() => false)) {
        matchingPages.push(page);
      }
    }
    if (matchingPages.length > 0) {
      return matchingPages;
    }
    await pages[0]?.waitForTimeout(150);
  }

  return [];
}

async function readVisibleBrainBoardCategories(hostPage: Page): Promise<string[]> {
  const boardGrid = hostPage.locator('[data-testid="brain-board-grid"]').first();
  await expect(boardGrid).toBeVisible({ timeout: 20_000 });

  return boardGrid.locator(".grid > div").evaluateAll((columns) => {
    return columns
      .map((column) => column.firstElementChild?.textContent?.trim() ?? "")
      .filter((categoryName) => categoryName.length > 0);
  });
}

function resolveStaticKidsBoard(categoryNames: string[]): JeopardyBoard {
  const signature = categoryNames.join("||");
  const matchedBoard = KIDS_BOARDS.find(
    (board) => board.categories.map((category) => category.name).join("||") === signature,
  );

  if (!matchedBoard) {
    throw new Error(`Could not resolve static kids board for categories: ${signature}`);
  }

  return matchedBoard;
}

function parseClueFromAriaLabel(board: JeopardyBoard, ariaLabel: string): JeopardyClue {
  const match = ariaLabel.match(/^(.*) for (\d+)$/);
  if (!match?.[1] || !match?.[2]) {
    throw new Error(`Unexpected Brain Board clue aria-label: ${ariaLabel}`);
  }

  const categoryName = match[1].trim();
  const value = Number.parseInt(match[2], 10);
  const category = board.categories.find((entry) => entry.name === categoryName);
  const clue = category?.clues.find((entry) => entry.value === value);

  if (!category || !clue) {
    throw new Error(`Could not resolve clue for ${categoryName} / ${value}`);
  }

  return clue;
}

async function selectFirstNonPowerPlayClue(
  hostPage: Page,
  controllerPages: Page[],
  board: JeopardyBoard,
): Promise<JeopardyClue> {
  while (true) {
    const selectorPage = await findBrainBoardSelector(hostPage, controllerPages, 30_000);
    const clueButton = selectorPage.locator(BRAIN_BOARD_CLUE_SELECTOR).first();
    await expect(clueButton).toBeVisible({ timeout: 20_000 });

    const ariaLabel = await clueButton.getAttribute("aria-label");
    if (!ariaLabel) {
      throw new Error("Missing Brain Board clue aria-label");
    }
    const clue = parseClueFromAriaLabel(board, ariaLabel);

    await clueButton.click();
    const nextPhase = await waitForAnyBrainBoardHostPhase(
      hostPage,
      ["answering", "power-play-wager"],
      20_000,
    );

    if (nextPhase === "answering") {
      return clue;
    }

    await clickSkip(hostPage);
    await waitForBrainBoardHostPhase(hostPage, "power-play-answer", 20_000);
    await clickSkip(hostPage);
    await waitForBrainBoardHostPhase(hostPage, "clue-result", 20_000);
    await clickSkip(hostPage);
    await waitForBrainBoardHostPhase(hostPage, "clue-select", 20_000);
  }
}

function lookupAllInAnswer(categoryName: string, question: string): string {
  const matchedClue = KIDS_BOARDS.flatMap((board) => board.categories)
    .filter((category) => category.name === categoryName)
    .flatMap((category) => category.clues)
    .find((clue) => clue.question === question);

  if (!matchedClue) {
    throw new Error(`Could not resolve all-in answer for ${categoryName}: ${question}`);
  }

  return matchedClue.answer;
}

test.describe("Brain Board Specialty Phases", () => {
  test.describe.configure({ timeout: 420_000 });

  test("power play is selector-only and carries the clue question into the answer step", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "standard",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      const allPages = [page, ...controllerPages];

      await driveBrainBoardToHostPhase(page, "power-play-wager");

      const wagerPages = await findPagesWithVisibleButton(allPages, /^lock in wager$/i, 20_000);
      expect(wagerPages).toHaveLength(1);

      const selectorPage = wagerPages[0];
      if (!selectorPage) {
        throw new Error("Missing selector page for Power Play");
      }

      for (const actorPage of allPages.filter((actorPage) => actorPage !== selectorPage)) {
        await expect(
          actorPage.getByRole("button", { name: /^lock in wager$/i }).first(),
        ).toHaveCount(0);
      }

      await selectorPage.getByRole("button", { name: /^max$/i }).click();
      await selectorPage.getByRole("button", { name: /^lock in wager$/i }).click();

      await waitForBrainBoardHostPhase(page, "power-play-answer", 20_000);
      const powerPlayQuestion = selectorPage.locator(
        '[data-testid="brain-board-power-play-question"]',
      );
      await expect(powerPlayQuestion).toBeVisible({ timeout: 20_000 });
      await expect(powerPlayQuestion).not.toHaveText(/^$/);

      for (const actorPage of allPages.filter((actorPage) => actorPage !== selectorPage)) {
        await expect(
          actorPage.locator('[data-testid="brain-board-power-play-question"]'),
        ).toHaveCount(0);
      }

      await submitTextAnswer(selectorPage, "definitely wrong power play answer");

      await waitForBrainBoardHostPhase(page, "clue-result", 20_000);
      await expect(page.getByText(/^power play$/i).first()).toBeVisible({ timeout: 15_000 });

      await clickSkip(page);
      await waitForBrainBoardHostPhase(page, "clue-select", 20_000);

      const leaderboardRows = page.locator('[data-testid="leaderboard-row"]');
      await expect(leaderboardRows.first()).toBeVisible({ timeout: 20_000 });
      const scores = await leaderboardRows.evaluateAll((rows) => {
        return rows.map((row) => Number.parseInt(row.getAttribute("data-score") ?? "0", 10));
      });
      expect(scores.some((score) => score < 0)).toBe(true);
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("eligible controllers keep all-in category and question context through wager and answer", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      await driveBrainBoardToClueSelect(page, controllerPages);

      const board = resolveStaticKidsBoard(await readVisibleBrainBoardCategories(page));
      const openingClue = await selectFirstNonPowerPlayClue(page, controllerPages, board);

      await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });
      await submitTextAnswer(page, openingClue.answer);
      await submitTextAnswer(controllerPages[0] as Page, openingClue.answer);
      await clickSkip(page);
      await waitForBrainBoardHostPhase(page, "clue-result", 20_000);

      await driveBrainBoardToHostPhase(page, "all-in-wager");

      const eligibleController = controllerPages[0] as Page;
      await expect(
        eligibleController.getByRole("button", { name: /^lock in wager$/i }),
      ).toBeVisible({
        timeout: 20_000,
      });
      const allInCategory = eligibleController.locator(
        '[data-testid="brain-board-all-in-category"]',
      );
      await expect(allInCategory).toBeVisible({ timeout: 20_000 });
      const categoryText = (await allInCategory.textContent())?.trim() ?? "";
      expect(categoryText.length).toBeGreaterThan(0);

      await eligibleController.getByRole("button", { name: /^max$/i }).click();
      await eligibleController.getByRole("button", { name: /^lock in wager$/i }).click();

      await clickSkip(page);
      await waitForBrainBoardHostPhase(page, "all-in-answer", 20_000);

      const allInAnswerCategory = eligibleController.locator(
        '[data-testid="brain-board-all-in-category"]',
      );
      const allInQuestion = eligibleController.locator(
        '[data-testid="brain-board-all-in-question"]',
      );
      await expect(allInAnswerCategory).toHaveText(categoryText, { timeout: 20_000 });
      await expect(allInQuestion).toBeVisible({ timeout: 20_000 });

      const questionText = (await allInQuestion.textContent())?.trim() ?? "";
      expect(questionText.length).toBeGreaterThan(0);

      const correctAllInAnswer = lookupAllInAnswer(categoryText, questionText);
      await submitTextAnswer(eligibleController, correctAllInAnswer);

      await clickSkip(page);
      await waitForBrainBoardHostPhase(page, "all-in-reveal", 20_000);

      await expect(page.getByText(/all-in reveal/i).first()).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(correctAllInAnswer, { exact: true }).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(eligibleController.locator('[data-testid="my-result"]')).toBeVisible({
        timeout: 20_000,
      });
      await expect(eligibleController.getByText(/\+\$\d+/).first()).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("only the host sees final-score restart actions", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      await driveBrainBoardToFinalScores(page, controllerPages);

      await expect(page.getByRole("button", { name: /play again/i })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByRole("button", { name: /new game/i })).toBeVisible({
        timeout: 20_000,
      });

      for (const controllerPage of controllerPages) {
        await expect(controllerPage.getByRole("button", { name: /play again/i })).toHaveCount(0);
        await expect(controllerPage.getByRole("button", { name: /new game/i })).toHaveCount(0);
      }
    } finally {
      await closeAllControllers(controllers);
    }
  });
});
