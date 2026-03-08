import { type Page, expect, test } from "@playwright/test";

import {
  closeAllControllers,
  driveBrainBoardToClueSelect,
  driveBrainBoardToFinalScores,
  driveBrainBoardToPhase,
  findBrainBoardSelector,
  skipToPhase,
  startGame,
  submitTextAnswer,
} from "./e2e-helpers";

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

test.describe("Brain Board Comprehensive", () => {
  test.describe.configure({ timeout: 900_000 });

  test("topic-chat phase shows on host and controller before category reveal", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      // The game starts with topic-chat phase. Host should show "Topic Lab".
      await expect(page.getByText(/topic lab/i).first()).toBeVisible({ timeout: 20_000 });

      // Host shows the AI greeting message
      await expect(page.getByText(/welcome to brain board/i).first()).toBeVisible({
        timeout: 10_000,
      });

      // Skip topic-chat -> generating-board or category-reveal
      const skipBtn = page.getByRole("button", { name: /^skip$/i });
      await skipBtn.click();

      // Should advance past topic-chat (to generating-board or category-reveal)
      await expect(page.getByText(/brain board/i).first()).toBeVisible({ timeout: 30_000 });
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("answering phase shows submission progress on host", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      const controllerPages = controllers.map((c) => c.controllerPage);
      await driveBrainBoardToClueSelect(page, controllerPages);

      // Selector picks a clue
      const selector = await findBrainBoardSelector(page, controllerPages);
      const firstClue = selector.locator('button[aria-label*=" for "]:enabled').first();
      await expect(firstClue).toBeVisible({ timeout: 15_000 });
      await firstClue.click();

      // Wait for answering phase
      await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });

      // Verify submission progress is displayed
      const progress = page.locator('[data-testid="submission-progress"]');
      await expect(progress).toBeVisible({ timeout: 10_000 });
      const progressText = await progress.textContent();
      expect(progressText).toMatch(/\d+\/\d+ submitted/);

      // Submit one answer
      const answeringController =
        controllerPages.find((cp) => cp !== selector) ?? (controllerPages[0] as Page);
      await submitTextAnswer(answeringController, "test answer");

      // Progress should update (wait a moment for broadcast)
      await page.waitForTimeout(500);
      const updatedText = await progress.textContent();
      expect(updatedText).toMatch(/\d+\/\d+ submitted/);
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("clue-result shows individual player answers with names on host", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      const controllerPages = controllers.map((c) => c.controllerPage);
      await driveBrainBoardToClueSelect(page, controllerPages);

      // Selector picks a clue
      const selector = await findBrainBoardSelector(page, controllerPages);
      const firstClue = selector.locator('button[aria-label*=" for "]:enabled').first();
      await expect(firstClue).toBeVisible({ timeout: 15_000 });
      await firstClue.click();

      // Wait for answering, submit distinct answers
      await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });
      await submitTextAnswer(controllerPages[0] as Page, "my first guess");
      await submitTextAnswer(controllerPages[1] as Page, "my second guess");
      await submitTextAnswer(page, "my host guess");

      // Wait for clue-result
      await expect(page.getByText(/correct answer/i).first()).toBeVisible({ timeout: 20_000 });

      // Verify both player names appear on the result screen
      await expect(page.getByText("Alpha", { exact: true }).first()).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText("Beta", { exact: true }).first()).toBeVisible({
        timeout: 10_000,
      });

      // Verify at least one of the submitted answers appears on the host result screen
      const hasAnswer1 = await page
        .getByText("my first guess")
        .first()
        .isVisible()
        .catch(() => false);
      const hasAnswer2 = await page
        .getByText("my second guess")
        .first()
        .isVisible()
        .catch(() => false);
      expect(hasAnswer1 || hasAnswer2).toBe(true);
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("controller shows BrainBoardClueResult with player results after answering", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      const controllerPages = controllers.map((c) => c.controllerPage);
      await driveBrainBoardToClueSelect(page, controllerPages);

      // Selector picks a clue
      const selector = await findBrainBoardSelector(page, controllerPages);
      const firstClue = selector.locator('button[aria-label*=" for "]:enabled').first();
      await expect(firstClue).toBeVisible({ timeout: 15_000 });
      await firstClue.click();

      await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });
      await submitTextAnswer(controllerPages[0] as Page, "wrong answer one");
      await submitTextAnswer(controllerPages[1] as Page, "wrong answer two");
      await submitTextAnswer(page, "wrong answer host");

      // Wait for clue-result on host
      await expect(page.getByText(/correct answer/i).first()).toBeVisible({ timeout: 20_000 });

      // Controller should show the "Correct Answer" text from BrainBoardClueResult
      const controllerShowsResult = await Promise.race([
        (async () => {
          const deadline = Date.now() + 15_000;
          while (Date.now() < deadline) {
            for (const cp of controllerPages) {
              const hasResult = await cp
                .getByText(/correct answer/i)
                .first()
                .isVisible()
                .catch(() => false);
              if (hasResult) return true;
            }
            await (controllerPages[0] as Page).waitForTimeout(200);
          }
          return false;
        })(),
      ]);
      expect(controllerShowsResult).toBe(true);
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("drives full game to final scores in kids mode", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      const controllerPages = controllers.map((c) => c.controllerPage);

      // Skip topic-chat first
      await skipToPhase(page, /brain board|double down/i, 5);

      // Drive through entire game to final scores
      await driveBrainBoardToFinalScores(page, controllerPages);

      await expect(page.locator('[data-testid="final-scores-root"]').first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.locator('[data-testid="final-score-row"][data-player-name="Alpha"]').first(),
      ).toBeVisible({
        timeout: 10_000,
      });
      await expect(
        page.locator('[data-testid="final-score-row"][data-player-name="Beta"]').first(),
      ).toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("all-in round shows category announcement on host", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      const controllerPages = controllers.map((c) => c.controllerPage);

      // Skip topic-chat
      await skipToPhase(page, /brain board|double down/i, 5);

      // Drive to the all-in round — it appears after all clues are revealed
      await driveBrainBoardToPhase(page, controllerPages, /all-in round/i, 1_200);

      // Verify "ALL-IN ROUND" heading is displayed on host
      await expect(page.getByText(/all-in round/i).first()).toBeVisible({ timeout: 10_000 });
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("all-in reveal shows correct answer and player answers on host", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      const controllerPages = controllers.map((c) => c.controllerPage);

      // Skip topic-chat
      await skipToPhase(page, /brain board|double down/i, 5);

      // Drive to all-in reveal
      await driveBrainBoardToPhase(page, controllerPages, /all-in reveal/i, 1_200);

      // "ALL-IN REVEAL" heading should be visible
      await expect(page.getByText(/all-in reveal/i).first()).toBeVisible({ timeout: 10_000 });

      // Correct answer text should appear
      await expect(page.getByText(/correct answer/i).first()).toBeVisible({ timeout: 20_000 });
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("round-transition shows Double Down on standard mode", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "standard",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      const controllerPages = controllers.map((c) => c.controllerPage);

      // Skip topic-chat
      await skipToPhase(page, /brain board|double down/i, 5);

      // Drive through round 1 clues until round-transition
      await driveBrainBoardToPhase(page, controllerPages, /double down/i, 1_200);

      // "DOUBLE DOWN!" text should be visible on host
      await expect(page.getByText(/double down/i).first()).toBeVisible({ timeout: 10_000 });

      // Controller should also show "Double Down!"
      const controllerShowsDD = await Promise.race([
        (async () => {
          const deadline = Date.now() + 15_000;
          while (Date.now() < deadline) {
            for (const cp of controllerPages) {
              const visible = await cp
                .getByText(/double down/i)
                .first()
                .isVisible()
                .catch(() => false);
              if (visible) return true;
            }
            await (controllerPages[0] as Page).waitForTimeout(200);
          }
          return false;
        })(),
      ]);
      expect(controllerShowsDD).toBe(true);
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("category-reveal shows all category names on host", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      const skipBtn = page.getByRole("button", { name: /^skip$/i });

      // Skip topic-chat to category-reveal explicitly.
      await expect(skipBtn).toBeVisible({ timeout: 15_000 });
      await skipBtn.click();

      // Host should show "BRAIN BOARD!" heading
      await expect(page.getByRole("heading", { name: /brain board!/i }).first()).toBeVisible({
        timeout: 20_000,
      });

      // There should be multiple revealed category labels visible, confirming the board loaded.
      const categoryPanels = page.locator("main span.font-display.text-accent-brainboard");
      await expect(categoryPanels.first()).toBeVisible({ timeout: 10_000 });
      const count = await categoryPanels.count();
      expect(count).toBeGreaterThanOrEqual(2);
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("non-selector controller sees board grid and standings during clue-select", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta", "Gamma"],
    });

    try {
      const controllerPages = controllers.map((c) => c.controllerPage);

      // Drive to clue-select deterministically
      await driveBrainBoardToClueSelect(page, controllerPages);

      // Wait for clue-select phase on host
      await expect(page.getByText("$200").first()).toBeVisible({ timeout: 15_000 });

      const findWatcher = async (): Promise<Page | null> => {
        for (const controllerPage of controllerPages) {
          const isWatcher =
            (await controllerPage
              .getByText(/'s pick/i)
              .first()
              .isVisible()
              .catch(() => false)) ||
            (await controllerPage
              .locator('[data-testid="controller-context-card"]')
              .first()
              .isVisible()
              .catch(() => false));
          if (isWatcher) {
            return controllerPage;
          }
        }
        return null;
      };

      await expect.poll(findWatcher, { timeout: 15_000 }).not.toBeNull();
      const watcher = (await findWatcher()) as Page;

      // Non-selector should see the brain-board-grid
      await expect(watcher.locator('[data-testid="brain-board-grid"]').first()).toBeVisible({
        timeout: 15_000,
      });

      // Non-selector should also see "pick" text indicating who is selecting
      await expect(watcher.getByText(/'s pick/i).first()).toBeVisible({ timeout: 10_000 });
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("host leaderboard rows have data-testid and data attributes", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      const controllerPages = controllers.map((c) => c.controllerPage);

      // Drive to clue-select where the leaderboard appears
      await driveBrainBoardToClueSelect(page, controllerPages);

      // Wait for leaderboard rows
      await expect(page.locator('[data-testid="leaderboard-row"]').first()).toBeVisible({
        timeout: 15_000,
      });

      // Verify leaderboard rows have data-player-id and data-score attributes
      const rows = page.locator('[data-testid="leaderboard-row"]');
      const rowCount = await rows.count();
      expect(rowCount).toBe(3); // Host + two joined players

      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const playerId = await row.getAttribute("data-player-id");
        const score = await row.getAttribute("data-score");
        expect(playerId).toBeTruthy();
        expect(score).not.toBeNull();
      }
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("answering phase shows clue question and category context on host", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      const controllerPages = controllers.map((c) => c.controllerPage);

      // Drive to clue-select deterministically
      await driveBrainBoardToClueSelect(page, controllerPages);

      // Selector picks a clue
      const selector = await findBrainBoardSelector(page, controllerPages);
      const firstClue = selector.locator('button[aria-label*=" for "]:enabled').first();
      await expect(firstClue).toBeVisible({ timeout: 15_000 });
      await firstClue.click();

      // Wait for answering phase
      await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });

      // The answering screen should show the clue value (e.g., "$200")
      const hasClueValue = await page
        .getByText(/\$\d+/)
        .first()
        .isVisible()
        .catch(() => false);
      expect(hasClueValue).toBe(true);
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("controller shows category and value context during answering", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      const controllerPages = controllers.map((c) => c.controllerPage);

      // Drive to clue-select deterministically
      await driveBrainBoardToClueSelect(page, controllerPages);

      // Selector picks a clue
      const selector = await findBrainBoardSelector(page, controllerPages);
      const firstClue = selector.locator('button[aria-label*=" for "]:enabled').first();
      await expect(firstClue).toBeVisible({ timeout: 15_000 });
      await firstClue.click();

      // Wait for answering phase on host
      await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });

      // Controllers should see a textbox to answer
      for (const cp of controllerPages) {
        await expect(cp.getByRole("textbox").first()).toBeVisible({ timeout: 15_000 });
      }

      // At least one controller should show the category/value badge
      let foundContext = false;
      for (const cp of controllerPages) {
        const hasValue = await cp
          .getByText(/\$\d+/)
          .first()
          .isVisible()
          .catch(() => false);
        if (hasValue) {
          foundContext = true;
          break;
        }
      }
      expect(foundContext).toBe(true);
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("clue-result distinguishes correct vs wrong answers visually", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      const controllerPages = controllers.map((c) => c.controllerPage);

      // Drive to clue-select deterministically
      await driveBrainBoardToClueSelect(page, controllerPages);

      // Selector picks a clue
      const selector = await findBrainBoardSelector(page, controllerPages);
      const firstClue = selector.locator('button[aria-label*=" for "]:enabled').first();
      await expect(firstClue).toBeVisible({ timeout: 15_000 });
      await firstClue.click();

      await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });

      // Submit wrong answers from every player so the round resolves deterministically
      const wrongAnswers = ["zzqxj-alpha-9173", "zzqxj-beta-1827", "zzqxj-host-4451"] as const;
      await submitTextAnswer(controllerPages[0] as Page, wrongAnswers[0]);
      await submitTextAnswer(controllerPages[1] as Page, wrongAnswers[1]);
      await submitTextAnswer(page, wrongAnswers[2]);

      // Wait for result
      await expect(page.getByText(/correct answer/i).first()).toBeVisible({ timeout: 20_000 });

      for (const answer of wrongAnswers) {
        await expect(page.getByText(answer).first()).toBeVisible({ timeout: 10_000 });
      }

      await expect
        .poll(
          async () =>
            (await page.locator("svg.text-destructive, span.text-destructive").count()) >= 3,
          { timeout: 10_000 },
        )
        .toBe(true);
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("kids mode full game completes without error and shows final scores", async ({
    page,
    browser,
  }) => {
    // This is an integration test that drives through the entire kids game
    // (1 round + all-in) and verifies it reaches final scores cleanly.
    test.setTimeout(480_000);

    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });

    try {
      const controllerPages = controllers.map((c) => c.controllerPage);

      // Skip topic-chat
      await skipToPhase(page, /brain board|double down/i, 10);

      // Drive to final scores
      await driveBrainBoardToFinalScores(page, controllerPages);

      await expect(page.locator('[data-testid="final-scores-root"]').first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.locator('[data-testid="final-score-row"][data-player-name="Alpha"]').first(),
      ).toBeVisible({
        timeout: 10_000,
      });
      await expect(
        page.locator('[data-testid="final-score-row"][data-player-name="Beta"]').first(),
      ).toBeVisible({
        timeout: 10_000,
      });

      // Controller should show final scores standings
      let controllerShowsFinal = false;
      for (const cp of controllerPages) {
        const hasFinal = await cp
          .getByText(/final scores|game over/i)
          .first()
          .isVisible()
          .catch(() => false);
        if (hasFinal) {
          controllerShowsFinal = true;
          break;
        }
      }
      // Controller shows standings or final scores card
      expect(controllerShowsFinal).toBe(true);
    } finally {
      await closeAllControllers(controllers);
    }
  });
});
