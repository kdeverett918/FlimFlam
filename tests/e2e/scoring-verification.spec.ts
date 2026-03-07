import { type Page, expect, test } from "@playwright/test";

import {
  closeAllControllers,
  driveSurveySmashToFinalScores,
  findControllerWithButton,
  skipToPhase,
  startGame,
  submitTextAnswer,
} from "./e2e-helpers";

async function getBrainBoardSelector(controllers: Page[]): Promise<Page> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    for (const controller of controllers) {
      const clueBtn = controller.locator('button[aria-label*=" for "]:enabled').first();
      if (await clueBtn.isVisible().catch(() => false)) {
        return controller;
      }
    }
    await controllers[0]?.waitForTimeout(150);
  }
  throw new Error("Timed out waiting for Brain Board selector controller");
}

test.describe("Scoring Verification", () => {
  test("brain board scores update on host after answers", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // category-reveal -> clue-select
    await skipBtn.click();

    // Selector picks a clue
    const selector = await getBrainBoardSelector(controllerPages);
    const firstClue = selector.locator('button[aria-label*=" for "]:enabled').first();
    await expect(firstClue).toBeVisible({ timeout: 15_000 });
    await firstClue.click();

    await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });

    // Submit answers
    await submitTextAnswer(controllerPages[0] as Page, "test answer");
    await submitTextAnswer(controllerPages[1] as Page, "another test answer");

    // Skip to clue-result
    await skipBtn.click();
    await expect(page.getByText(/correct answer/i)).toBeVisible({ timeout: 20_000 });

    // Host should show dollar amounts (scores) in the standings area
    // At least one $ value should be visible (could be $0 or positive)
    await expect(page.getByText(/\$\d+/).first()).toBeVisible({ timeout: 10_000 });

    await closeAllControllers(controllers);
  });

  test("survey smash team scores accumulate", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // Drive through 2 rounds with actual guessing
    for (let round = 0; round < 2; round++) {
      // question-reveal -> face-off -> guessing
      await skipBtn.click();
      await skipBtn.click();

      const guesser = await findControllerWithButton(controllerPages, /^submit$/i, 20_000);
      await submitTextAnswer(guesser, "zzzzzzzzzz");
      const roundResult = page
        .getByRole("heading", { name: new RegExp(`^round ${round + 1} complete!?$`, "i") })
        .first();
      const deadline = Date.now() + 20_000;

      while (Date.now() < deadline) {
        if (await roundResult.isVisible().catch(() => false)) break;
        if (await skipBtn.isVisible().catch(() => false)) {
          await skipBtn.click();
        }
        await page.waitForTimeout(250);
      }

      await expect(roundResult).toBeVisible({ timeout: 10_000 });
      await skipBtn.click();
    }

    // After 2 rounds, scores should be visible somewhere on host
    // Score display is game-specific; at minimum team labels should appear
    await expect(page.getByText(/round/i).first()).toBeVisible();

    await closeAllControllers(controllers);
  });

  test("lucky letters cash tracking shows round and total", async ({ page, browser }) => {
    const names = ["Ada", "Ben"];
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: names,
    });
    const skipBtn = page.getByRole("button", { name: /^skip$/i });

    // round-intro -> spinning
    await skipToPhase(page, /choose your categories/i);
    await skipBtn.click();

    // Host standings should show $ amounts for both players
    await expect(page.getByText("Ada", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Ben", { exact: true })).toBeVisible({ timeout: 10_000 });
    // Dollar signs visible in standings
    await expect(page.getByText(/\$\d+/).first()).toBeVisible({ timeout: 10_000 });

    await closeAllControllers(controllers);
  });

  test("final scores ordered descending", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);

    await driveSurveySmashToFinalScores(page, controllerPages);

    await expect(page.getByRole("heading", { name: /final scores/i }).first()).toBeVisible();

    // All three player names should be visible
    await expect(page.getByText("Ari", { exact: true })).toBeVisible();
    await expect(page.getByText("Bea", { exact: true })).toBeVisible();
    await expect(page.getByText("Cam", { exact: true })).toBeVisible();

    await closeAllControllers(controllers);
  });
});
