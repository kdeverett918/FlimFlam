import { type Page, expect, test } from "@playwright/test";

import {
  closeAllControllers,
  driveBrainBoardToFinalScores,
  driveBrainBoardToPhase,
  findBrainBoardSelectorController,
  skipToPhase,
  startGame,
  submitTextAnswer,
} from "./e2e-helpers";

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

test.describe("Brain Board Comprehensive", () => {
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
      await expect(page.getByText(/topic lab/i)).toBeVisible({ timeout: 20_000 });

      // Host shows the AI greeting message
      await expect(page.getByText(/welcome to brain board/i)).toBeVisible({
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
      const skipBtn = page.getByRole("button", { name: /^skip$/i });

      // topic-chat -> skip to category-reveal
      await skipToPhase(page, /brain board|double down/i, 5);

      // category-reveal -> clue-select
      await skipBtn.click();

      // Selector picks a clue
      const selector = await findBrainBoardSelectorController(controllerPages);
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
      const skipBtn = page.getByRole("button", { name: /^skip$/i });

      // topic-chat -> category-reveal -> clue-select
      await skipToPhase(page, /brain board|double down/i, 5);
      await skipBtn.click();

      // Selector picks a clue
      const selector = await findBrainBoardSelectorController(controllerPages);
      const firstClue = selector.locator('button[aria-label*=" for "]:enabled').first();
      await expect(firstClue).toBeVisible({ timeout: 15_000 });
      await firstClue.click();

      // Wait for answering, submit distinct answers
      await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });
      await submitTextAnswer(controllerPages[0] as Page, "my first guess");
      await submitTextAnswer(controllerPages[1] as Page, "my second guess");

      // Wait for clue-result
      await expect(page.getByText(/correct answer/i)).toBeVisible({ timeout: 20_000 });

      // Verify both player names appear on the result screen
      await expect(page.getByText("Alpha", { exact: true })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("Beta", { exact: true })).toBeVisible({ timeout: 10_000 });

      // Verify at least one of the submitted answers appears on the host result screen
      const hasAnswer1 = await page
        .getByText("my first guess")
        .isVisible()
        .catch(() => false);
      const hasAnswer2 = await page
        .getByText("my second guess")
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
      const skipBtn = page.getByRole("button", { name: /^skip$/i });

      // topic-chat -> category-reveal -> clue-select
      await skipToPhase(page, /brain board|double down/i, 5);
      await skipBtn.click();

      // Selector picks a clue
      const selector = await findBrainBoardSelectorController(controllerPages);
      const firstClue = selector.locator('button[aria-label*=" for "]:enabled').first();
      await expect(firstClue).toBeVisible({ timeout: 15_000 });
      await firstClue.click();

      await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });
      await submitTextAnswer(controllerPages[0] as Page, "wrong answer one");
      await submitTextAnswer(controllerPages[1] as Page, "wrong answer two");

      // Wait for clue-result on host
      await expect(page.getByText(/correct answer/i)).toBeVisible({ timeout: 20_000 });

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

      // Final scores heading should be visible
      await expect(page.getByRole("heading", { name: /final scores/i }).first()).toBeVisible({
        timeout: 20_000,
      });

      // Player names should appear on final scores
      await expect(page.getByText("Alpha")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("Beta")).toBeVisible({ timeout: 10_000 });
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
      // Skip topic-chat to category-reveal
      await skipToPhase(page, /brain board/i, 5);

      // Host should show "BRAIN BOARD!" heading
      await expect(page.getByText(/brain board/i).first()).toBeVisible({ timeout: 20_000 });

      // There should be multiple category panels visible (6 categories)
      // Each category is rendered inside a GlassPanel with uppercase text.
      // We just verify that at least 2 distinct category elements are visible,
      // confirming the board was loaded.
      const categoryPanels = page.locator(
        ".font-display.uppercase.text-accent-brainboard.text-center",
      );
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

      // Skip to clue-select
      await skipToPhase(page, /brain board|double down/i, 5);
      const skipBtn = page.getByRole("button", { name: /^skip$/i });
      await skipBtn.click();

      // Wait for clue-select phase on host
      await expect(page.getByText("$200").first()).toBeVisible({ timeout: 15_000 });

      // Find the selector controller
      const selector = await findBrainBoardSelectorController(controllerPages, 20_000);

      // Find a non-selector controller
      const nonSelectors = controllerPages.filter((cp) => cp !== selector);
      expect(nonSelectors.length).toBeGreaterThanOrEqual(1);
      const watcher = nonSelectors[0] as Page;

      // Non-selector should see the brain-board-grid
      await expect(watcher.locator('[data-testid="brain-board-grid"]')).toBeVisible({
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
      // Skip to clue-select where the leaderboard appears
      await skipToPhase(page, /brain board|double down/i, 5);
      const skipBtn = page.getByRole("button", { name: /^skip$/i });
      await skipBtn.click();

      // Wait for leaderboard rows
      await expect(page.locator('[data-testid="leaderboard-row"]').first()).toBeVisible({
        timeout: 15_000,
      });

      // Verify leaderboard rows have data-player-id and data-score attributes
      const rows = page.locator('[data-testid="leaderboard-row"]');
      const rowCount = await rows.count();
      expect(rowCount).toBe(2); // Two players

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
      const skipBtn = page.getByRole("button", { name: /^skip$/i });

      // topic-chat -> category-reveal -> clue-select
      await skipToPhase(page, /brain board|double down/i, 5);
      await skipBtn.click();

      // Selector picks a clue
      const selector = await findBrainBoardSelectorController(controllerPages);
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
      const skipBtn = page.getByRole("button", { name: /^skip$/i });

      // topic-chat -> category-reveal -> clue-select
      await skipToPhase(page, /brain board|double down/i, 5);
      await skipBtn.click();

      // Selector picks a clue
      const selector = await findBrainBoardSelectorController(controllerPages);
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
      const skipBtn = page.getByRole("button", { name: /^skip$/i });

      // topic-chat -> category-reveal -> clue-select
      await skipToPhase(page, /brain board|double down/i, 5);
      await skipBtn.click();

      // Selector picks a clue
      const selector = await findBrainBoardSelectorController(controllerPages);
      const firstClue = selector.locator('button[aria-label*=" for "]:enabled').first();
      await expect(firstClue).toBeVisible({ timeout: 15_000 });
      await firstClue.click();

      await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });

      // Submit wrong answers from both
      await submitTextAnswer(controllerPages[0] as Page, "definitely wrong");
      await submitTextAnswer(controllerPages[1] as Page, "also definitely wrong");

      // Wait for result
      await expect(page.getByText(/correct answer/i)).toBeVisible({ timeout: 20_000 });

      // Since both answers are wrong, "No one got it!" should appear
      await expect(page.getByText(/no one got it/i)).toBeVisible({ timeout: 10_000 });
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
    test.setTimeout(180_000);

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

      // Verify final scores display
      const heading = page.getByRole("heading", { name: /final scores/i }).first();
      await expect(heading).toBeVisible({ timeout: 20_000 });

      // Both players should be listed
      await expect(page.getByText("Alpha")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("Beta")).toBeVisible({ timeout: 10_000 });

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
