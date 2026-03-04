import { expect, test } from "@playwright/test";

import { closeAllControllers, findBrainBoardSelectorController, startGame } from "./e2e-helpers";

test.describe("Privacy Redaction", () => {
  test("Survey Smash controllers do not see full answer bank before answer-reveal", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Alpha", "Beta", "Gamma"],
    });
    const controllerPages = controllers.map((controller) => controller.controllerPage);
    const skipButton = page.getByRole("button", { name: /^skip$/i });

    // question-reveal -> face-off -> guessing
    await skipButton.click();
    await skipButton.click();

    for (const controllerPage of controllerPages) {
      await expect(controllerPage.getByText(/answers revealed!/i)).toHaveCount(0);
      await expect(controllerPage.getByText(/the people say/i)).toHaveCount(0);
    }

    await closeAllControllers(controllers);
  });

  test("Lucky Letters gameplay keeps solution hidden until reveal phases", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });
    const controllerPages = controllers.map((controller) => controller.controllerPage);
    const skipButton = page.getByRole("button", { name: /^skip$/i });

    // round-intro -> spinning
    await skipButton.click();

    for (const controllerPage of controllerPages) {
      await expect(controllerPage.getByText(/the answer was/i)).toHaveCount(0);
    }

    await closeAllControllers(controllers);
  });

  test("Brain Board answering phase shows question but not correct answer", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });
    const controllerPages = controllers.map((controller) => controller.controllerPage);
    const skipButton = page.getByRole("button", { name: /^skip$/i });

    // category-reveal -> clue-select
    await skipButton.click();

    const selector = await findBrainBoardSelectorController(controllerPages);
    await selector.locator('button[aria-label*=" for "]:enabled').first().click();
    await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });

    for (const controllerPage of controllerPages) {
      await expect(controllerPage.getByText(/correct answer/i)).toHaveCount(0);
    }

    await closeAllControllers(controllers);
  });
});
