import { expect, test } from "@playwright/test";

import {
  createRoom,
  findControllerWithButton,
  joinControllersForRoom,
  selectGameAndStart,
  waitForColyseusHealthy,
} from "./e2e-helpers";

test("survey smash standard mode reaches lightning round and resolves to final scores", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await waitForColyseusHealthy(page);

  const { code } = await createRoom(page);
  const joined = await joinControllersForRoom(browser, page, code, ["Leo", "Ivy", "Max"]);
  const controllerPages = joined.map((c) => c.controllerPage);

  await selectGameAndStart(page, { gameName: "Survey Smash", complexity: "standard" });

  const skipButton = page.getByRole("button", { name: /^skip$/i });

  // Burn through 4 regular rounds by forcing a strike each round.
  for (let round = 1; round <= 4; round++) {
    await skipButton.click(); // question-reveal -> face-off
    await skipButton.click(); // face-off -> guessing

    const guesser = await findControllerWithButton(controllerPages, /^submit$/i, 20_000);
    await guesser.getByRole("textbox").first().fill("zzzzzz");
    await guesser
      .getByRole("button", { name: /^submit$/i })
      .first()
      .click();

    await expect(page.getByText(/^strike!?$/i)).toBeVisible({ timeout: 15_000 });
    await skipButton.click(); // strike -> round-result
    await skipButton.click(); // round-result -> next round/lightning
  }

  await expect(page.getByText(/lightning round/i)).toBeVisible({ timeout: 20_000 });

  // Lightning phase uses QuickGuessInput ("Guess" button) for the selected player.
  for (let i = 0; i < 5; i++) {
    const lightningController = await findControllerWithButton(controllerPages, /^guess$/i, 20_000);
    const input = lightningController.getByRole("textbox").first();
    await input.fill(`guess-${i + 1}`);
    await lightningController
      .getByRole("button", { name: /^guess$/i })
      .first()
      .click();
  }

  await expect(page.getByText(/lightning round results/i)).toBeVisible({ timeout: 20_000 });
  await skipButton.click();
  await expect(page.getByRole("heading", { name: /final scores/i }).first()).toBeVisible({
    timeout: 30_000,
  });

  for (const controller of joined) {
    await controller.context.close();
  }
});
