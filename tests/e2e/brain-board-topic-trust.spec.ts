import { type Page, expect, test } from "@playwright/test";

import { closeAllControllers, findBrainBoardSelector, startGame } from "./e2e-helpers";

async function sendTopicMessage(controllerPage: Page, topic: string): Promise<void> {
  const input = controllerPage.locator('input[placeholder="Suggest a topic..."]').first();
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.fill(topic);
  await controllerPage.locator('button[aria-label="Send message"]').first().click();
}

test.describe("Brain Board Topic Trust", () => {
  test.describe.configure({ timeout: 240_000 });
  test.skip(process.env.FLIMFLAM_DISABLE_AI !== "1", "Requires FLIMFLAM_DISABLE_AI=1");

  test("shows reflected topics and honest curated fallback when AI is disabled", async ({
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
      const firstController = controllerPages[0];
      const secondController = controllerPages[1];
      expect(firstController).toBeTruthy();
      expect(secondController).toBeTruthy();
      if (!firstController || !secondController) return;

      await expect(page.getByText(/topic lab/i).first()).toBeVisible({ timeout: 20_000 });
      await expect(firstController.getByText(/topic lab/i).first()).toBeVisible({
        timeout: 20_000,
      });

      await sendTopicMessage(firstController, "Space exploration and rockets");
      await sendTopicMessage(secondController, "Street food and world travel");

      const topicChips = page.locator('[data-testid="brainboard-topic-chips"]');
      await expect(topicChips).toBeVisible({ timeout: 20_000 });
      await expect
        .poll(async () => topicChips.locator("span").count(), {
          timeout: 15_000,
          interval: 250,
        })
        .toBeGreaterThan(0);

      await page.getByRole("button", { name: /^skip$/i }).click();

      const personalizationBadge = page
        .locator('[data-testid="brainboard-personalization-badge"]')
        .first();
      const personalizationMessage = page
        .locator('[data-testid="brainboard-personalization-message"]')
        .first();

      await expect(personalizationBadge).toHaveText(/curated/i, { timeout: 60_000 });
      await expect(personalizationMessage).toBeVisible({ timeout: 60_000 });
      const messageText = (await personalizationMessage.textContent()) ?? "";
      expect(messageText).not.toMatch(/ai personalized|personalized from your/i);

      const selector = await findBrainBoardSelector(page, controllerPages, 30_000);
      const clueButton = selector.locator('button[aria-label*=" for "]:enabled').first();
      await expect(clueButton).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/loading brain board/i)).toHaveCount(0);

      await clueButton.click();

      await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/loading brain board/i)).toHaveCount(0);
    } finally {
      await closeAllControllers(controllers);
    }
  });
});
