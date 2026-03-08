import { type Page, expect, test } from "@playwright/test";

import { KIDS_BOARDS } from "../../games/brain-board/src/content/clue-bank";
import {
  closeAllControllers,
  driveBrainBoardToClueSelect,
  driveBrainBoardToPhase,
  findBrainBoardSelector,
  startGame,
  submitTextAnswer,
} from "./e2e-helpers";

type StaticClue = {
  answer: string;
  category: string;
  question: string;
  value: number;
};

const KIDS_CLUES: StaticClue[] = KIDS_BOARDS.flatMap((board) =>
  board.categories.flatMap((category) =>
    category.clues.map((clue) => ({
      answer: clue.answer,
      category: category.name,
      question: clue.question,
      value: clue.value,
    })),
  ),
);

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function findKidsClue(question: string): StaticClue {
  const normalizedQuestion = normalizeText(question);
  const clue = KIDS_CLUES.find((entry) => normalizeText(entry.question) === normalizedQuestion);
  if (!clue) {
    throw new Error(`Could not map Brain Board clue question to kids clue bank: ${question}`);
  }
  return clue;
}

async function readBrainBoardPhase(hostPage: Page): Promise<string | null> {
  return hostPage
    .locator('[data-testid="brain-board-host-state"]')
    .first()
    .getAttribute("data-phase")
    .catch(() => null);
}

async function waitForBrainBoardPhase(
  hostPage: Page,
  phase: string,
  timeoutMs = 20_000,
): Promise<void> {
  await expect.poll(async () => readBrainBoardPhase(hostPage), { timeout: timeoutMs }).toBe(phase);
}

async function waitForBrainBoardPhaseChange(
  hostPage: Page,
  previousPhase: string,
  timeoutMs = 10_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const phase = await readBrainBoardPhase(hostPage);
    if (phase && phase !== previousPhase) {
      return phase;
    }
    await hostPage.waitForTimeout(100);
  }
  throw new Error(`Timed out waiting for Brain Board phase to change from ${previousPhase}`);
}

async function readVisibleQuestion(page: Page): Promise<string> {
  const question = await page.locator("main p").evaluateAll((elements) => {
    const visibleTexts = elements
      .map((element) => {
        if (!(element instanceof HTMLElement)) return "";
        if (element.offsetParent === null) return "";
        return (element.textContent ?? "").replace(/\s+/g, " ").trim();
      })
      .filter((text) => text.length > 0);

    return (
      visibleTexts.find((text) => text.endsWith("?")) ??
      visibleTexts.sort((left, right) => right.length - left.length)[0] ??
      ""
    );
  });

  if (!question) {
    throw new Error("Could not find a visible Brain Board clue question");
  }
  return normalizeText(question);
}

async function collectPagesWithVisibleButton(pages: Page[], buttonName: RegExp): Promise<Page[]> {
  const matches: Page[] = [];
  for (const page of pages) {
    const button = page.getByRole("button", { name: buttonName }).first();
    const visible = await button.isVisible().catch(() => false);
    if (visible) {
      matches.push(page);
    }
  }
  return matches;
}

async function collectPagesWithVisibleTextbox(pages: Page[]): Promise<Page[]> {
  const matches: Page[] = [];
  for (const page of pages) {
    const textbox = page.getByRole("textbox").first();
    const visible = await textbox.isVisible().catch(() => false);
    if (visible) {
      matches.push(page);
    }
  }
  return matches;
}

async function driveBrainBoardBackToClueSelect(
  hostPage: Page,
  controllerPages: Page[],
  timeoutMs = 60_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });
  const skippablePhases = new Set([
    "category-submit",
    "topic-chat",
    "generating-board",
    "category-reveal",
    "power-play-wager",
    "power-play-answer",
    "answering",
    "clue-result",
    "round-transition",
  ]);

  while (Date.now() < deadline) {
    const phase = await readBrainBoardPhase(hostPage);
    if (phase === "clue-select") {
      return;
    }

    if (phase && skippablePhases.has(phase) && (await skipButton.isVisible().catch(() => false))) {
      await skipButton.click().catch(() => {});
      await hostPage.waitForTimeout(150);
      continue;
    }

    await driveBrainBoardToClueSelect(hostPage, controllerPages, 5_000).catch(() => {});
    if ((await readBrainBoardPhase(hostPage)) === "clue-select") {
      return;
    }
    await hostPage.waitForTimeout(150);
  }

  throw new Error("Timed out returning Brain Board to clue-select");
}

async function driveBrainBoardToPowerPlay(hostPage: Page, controllerPages: Page[]): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await driveBrainBoardToClueSelect(hostPage, controllerPages, 30_000);

    const selector = await findBrainBoardSelector(hostPage, controllerPages, 20_000);
    const clueButton = selector.locator('button[aria-label*=" for "]:enabled').first();
    await expect(clueButton).toBeVisible({ timeout: 10_000 });
    await clueButton.click();

    const nextPhase = await waitForBrainBoardPhaseChange(hostPage, "clue-select", 10_000);
    if (nextPhase === "power-play-wager") {
      return;
    }

    await driveBrainBoardBackToClueSelect(hostPage, controllerPages);
  }

  throw new Error("Timed out finding a hidden Brain Board Power Play clue");
}

async function driveBrainBoardToStandardAnswering(
  hostPage: Page,
  controllerPages: Page[],
): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await driveBrainBoardToClueSelect(hostPage, controllerPages, 30_000);

    const selector = await findBrainBoardSelector(hostPage, controllerPages, 20_000);
    const clueButton = selector.locator('button[aria-label*=" for "]:enabled').first();
    await expect(clueButton).toBeVisible({ timeout: 10_000 });
    await clueButton.click();

    const nextPhase = await waitForBrainBoardPhaseChange(hostPage, "clue-select", 10_000);
    if (nextPhase === "answering") {
      return;
    }

    await driveBrainBoardBackToClueSelect(hostPage, controllerPages);
  }

  throw new Error("Timed out finding a standard Brain Board clue");
}

function resolveActorName(actorPage: Page, hostPage: Page, controllerPages: Page[]): string {
  if (actorPage === hostPage) {
    return "Host";
  }

  const controllerIndex = controllerPages.findIndex((page) => page === actorPage);
  if (controllerIndex < 0) {
    throw new Error("Could not map Brain Board actor page to a player");
  }

  return ["Alpha", "Beta"][controllerIndex] ?? `Player ${controllerIndex + 1}`;
}

async function readHostScoreFor(page: Page, playerName: string): Promise<number | null> {
  const rows = page.locator('[data-testid="leaderboard-row"]');
  const count = await rows.count();

  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const text = normalizeText(await row.textContent().catch(() => null));
    if (!text.toLowerCase().includes(playerName.toLowerCase())) {
      continue;
    }
    const rawScore = await row.getAttribute("data-score");
    return rawScore ? Number.parseInt(rawScore, 10) : null;
  }

  return null;
}

test.describe("Brain Board Premium Flows", () => {
  test.describe.configure({ timeout: 300_000 });

  test("power play locks wager + answer to one actor and scores by the locked wager", async ({
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
      const allPages = [page, ...controllerPages];

      await driveBrainBoardToPowerPlay(page, controllerPages);
      await waitForBrainBoardPhase(page, "power-play-wager");

      let wagerPages: Page[] = [];
      await expect
        .poll(
          async () => {
            wagerPages = await collectPagesWithVisibleButton(allPages, /lock in wager/i);
            return wagerPages.length;
          },
          { timeout: 10_000 },
        )
        .toBe(1);

      const actorPage = wagerPages[0];
      if (!actorPage) {
        throw new Error("Expected one Power Play wager actor page");
      }

      await expect(actorPage.locator('[data-testid="number-input-range"]')).toHaveText(/5 - 1000/i);
      await actorPage.getByRole("button", { name: /^max$/i }).click();
      await actorPage.getByRole("button", { name: /lock in wager/i }).click();

      await waitForBrainBoardPhase(page, "power-play-answer");

      let answerPages: Page[] = [];
      await expect
        .poll(
          async () => {
            answerPages = await collectPagesWithVisibleTextbox(allPages);
            return answerPages.length;
          },
          { timeout: 10_000 },
        )
        .toBe(1);
      expect(answerPages[0]).toBe(actorPage);

      const question = await readVisibleQuestion(actorPage);
      const clue = findKidsClue(question);

      await submitTextAnswer(actorPage, clue.answer);
      await expect(page.getByText(/correct answer/i).first()).toBeVisible({ timeout: 20_000 });

      await driveBrainBoardBackToClueSelect(page, controllerPages, 20_000);

      const actorName = resolveActorName(actorPage, page, controllerPages);
      await expect
        .poll(async () => readHostScoreFor(page, actorName), { timeout: 10_000 })
        .toBe(1000);
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("all-in reveal stays on-screen long enough to show every eligible player", async ({
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
      const allPages = [page, ...controllerPages];
      const skipButton = page.getByRole("button", { name: /^skip$/i });

      await driveBrainBoardToStandardAnswering(page, controllerPages);
      await waitForBrainBoardPhase(page, "answering");

      const question = await readVisibleQuestion(page);
      const clue = findKidsClue(question);

      for (const actorPage of allPages) {
        await submitTextAnswer(actorPage, clue.answer);
      }

      await expect(page.getByText(/correct answer/i).first()).toBeVisible({ timeout: 20_000 });
      await driveBrainBoardBackToClueSelect(page, controllerPages, 20_000);

      await driveBrainBoardToPhase(page, controllerPages, /all-in round/i, 1_800);

      let wagerPages: Page[] = [];
      await expect
        .poll(
          async () => {
            wagerPages = await collectPagesWithVisibleButton(allPages, /lock in wager/i);
            return wagerPages.length;
          },
          { timeout: 15_000 },
        )
        .toBe(3);

      for (const wagerPage of wagerPages) {
        await wagerPage.getByRole("button", { name: /^max$/i }).click();
        await wagerPage.getByRole("button", { name: /lock in wager/i }).click();
      }

      await waitForBrainBoardPhase(page, "all-in-answer");
      await skipButton.click();

      await waitForBrainBoardPhase(page, "all-in-reveal");
      await expect(page.locator('[data-testid="brainboard-all-in-reveal"]')).toBeVisible({
        timeout: 10_000,
      });
      await expect
        .poll(async () => page.locator('[data-testid="brainboard-all-in-result-row"]').count(), {
          timeout: 15_000,
        })
        .toBe(3);
    } finally {
      await closeAllControllers(controllers);
    }
  });
});
