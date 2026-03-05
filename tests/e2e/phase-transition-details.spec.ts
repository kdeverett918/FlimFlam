import { expect, test } from "@playwright/test";

import { closeAllControllers, driveBrainBoardToPhase, startGame } from "./e2e-helpers";

test.describe("Phase Transition Details", () => {
  test("brain board phase transition shows round counter that increments", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);

    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);

    // First round transition should show "Round 1/3"
    await expect(page.getByText(/round 1\/3/i)).toBeVisible({ timeout: 20_000 });

    // Drive through the first round to reach round 2
    await driveBrainBoardToPhase(page, controllerPages, /round 2/i, 600);

    // Second round transition should show "Round 2/3"
    await expect(page.getByText(/round 2\/3/i)).toBeVisible({ timeout: 20_000 });

    await closeAllControllers(controllers);
  });

  test("survey smash shows transition overlay on each new question", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam"],
    });

    // First phase transition should show "New Question!" heading
    await expect(page.getByRole("heading", { name: /new question/i })).toBeVisible({
      timeout: 15_000,
    });

    await closeAllControllers(controllers);
  });

  test("lucky letters shows transition overlay with round info", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });

    // Phase transition should show "New Round!"
    await expect(page.getByRole("heading", { name: /new round/i })).toBeVisible({
      timeout: 15_000,
    });

    // Should also show round counter
    await expect(page.getByText(/round 1\/3/i)).toBeVisible({ timeout: 15_000 });

    await closeAllControllers(controllers);
  });
});
