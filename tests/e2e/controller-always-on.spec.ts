import { type Page, expect, test } from "@playwright/test";

import {
  closeAllControllers,
  findBrainBoardSelectorController,
  findLuckyLettersTurnActor,
  skipToPhase,
  startGame,
} from "./e2e-helpers";

async function submitSurveySmashAnswerFromAnyController(
  controllerPages: Page[],
  answer: string,
): Promise<Page> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    for (const controllerPage of controllerPages) {
      const guessAlongMarker = controllerPage.getByText(/guess along/i).first();
      if (await guessAlongMarker.isVisible().catch(() => false)) {
        continue;
      }

      const textbox = controllerPage.getByRole("textbox").first();
      if (!(await textbox.isVisible().catch(() => false))) {
        continue;
      }

      await textbox.fill(answer).catch(() => {});

      const submitButton = controllerPage.getByRole("button", { name: /^submit$/i }).first();
      if (
        (await submitButton.isVisible().catch(() => false)) &&
        (await submitButton.isEnabled().catch(() => false))
      ) {
        await submitButton.click().catch(() => {});
        return controllerPage;
      }

      const guessButton = controllerPage.getByRole("button", { name: /^guess$/i }).first();
      if (
        (await guessButton.isVisible().catch(() => false)) &&
        (await guessButton.isEnabled().catch(() => false))
      ) {
        await guessButton.click().catch(() => {});
        return controllerPage;
      }
    }

    await controllerPages[0]?.waitForTimeout(150);
  }

  throw new Error("Timed out submitting a Survey Smash answer from any active controller");
}

test.describe("Controller Always-On Context", () => {
  test("survey smash keeps non-active controllers engaged and exposes team + result cards", async ({
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

    const firstController = controllerPages[0] as Page;
    await expect(firstController.locator('[data-testid="team-pill"]')).toBeVisible({
      timeout: 15_000,
    });
    await firstController.locator('[data-testid="team-pill"]').click();
    await expect(firstController.locator('[data-testid="team-roster-sheet"]')).toBeVisible({
      timeout: 10_000,
    });

    await skipButton.click();
    await skipButton.click();

    const guesser = await submitSurveySmashAnswerFromAnyController(
      controllerPages,
      "zzzz-controller-always-on",
    );
    for (const controllerPage of controllerPages) {
      if (controllerPage === guesser) continue;
      const contextCard = controllerPage.locator('[data-testid="controller-context-card"]');
      const hasContextCard = await contextCard.isVisible().catch(() => false);
      if (hasContextCard) continue;

      const hasInput = await controllerPage
        .getByRole("textbox")
        .first()
        .isVisible()
        .catch(() => false);
      const hasGuessAlong = await controllerPage
        .getByText(/guess along!/i)
        .first()
        .isVisible()
        .catch(() => false);
      const hasTeamPill = await controllerPage
        .locator('[data-testid="team-pill"]')
        .isVisible()
        .catch(() => false);

      expect(hasInput || hasGuessAlong || hasTeamPill).toBe(true);
    }

    await closeAllControllers(controllers);
  });

  test("lucky letters shows contextual watch card to non-active controller", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });
    const controllerPages = controllers.map((controller) => controller.controllerPage);
    const skipButton = page.getByRole("button", { name: /^skip$/i });

    await skipToPhase(page, /choose your categories/i);
    await skipButton.click();

    const { watchingPage: watchController } = await findLuckyLettersTurnActor(
      page,
      controllerPages,
      ["Ada", "Ben"],
    );
    if (!watchController) {
      throw new Error("Expected a non-active Lucky Letters controller");
    }

    await expect(watchController.locator('[data-testid="controller-context-card"]')).toBeVisible({
      timeout: 10_000,
    });

    await closeAllControllers(controllers);
  });

  test("brain board non-selector sees read-only grid context instead of dead waiting", async ({
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
    const watcher = controllerPages.find((controllerPage) => controllerPage !== selector);
    if (!watcher) {
      throw new Error("Expected a non-selector Brain Board controller");
    }

    await expect(watcher.locator('[data-testid="controller-context-card"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(watcher.locator('[data-testid="brain-board-grid"]')).toBeVisible({
      timeout: 10_000,
    });

    await closeAllControllers(controllers);
  });
});
