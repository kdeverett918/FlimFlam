import { type Page, expect, test } from "@playwright/test";

import {
  createRoom,
  joinControllersForRoom,
  selectGameAndStart,
  waitForColyseusHealthy,
} from "./e2e-helpers";

async function getBrainBoardSelectorController(controllers: Page[]): Promise<Page> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    for (const controller of controllers) {
      const startButton = controller.getByRole("button", { name: /^start$/i });
      if (await startButton.isVisible().catch(() => false)) {
        return controller;
      }
      const clueButton = controller.locator('button[aria-label*=" for "]:enabled').first();
      if (await clueButton.isVisible().catch(() => false)) {
        return controller;
      }
    }
    await controllers[0]?.waitForTimeout(150);
  }
  throw new Error("Timed out waiting for Brain Board selector controller");
}

test.describe("Brain Board Flow", () => {
  test("selectors can pick clues and players can submit answers", async ({ page, browser }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);

    const { code } = await createRoom(page);
    const joined = await joinControllersForRoom(browser, page, code, ["Alpha", "Beta"]);
    const controllerPages = joined.map((c) => c.controllerPage);

    await selectGameAndStart(page, { gameName: "Brain Board", complexity: "kids" });

    // Skip long category reveal intro into clue selection.
    const skipButton = page.getByRole("button", { name: /^skip$/i });
    await skipButton.click();

    const selector = await getBrainBoardSelectorController(controllerPages);
    const firstClue = selector.locator('button[aria-label*=" for "]:enabled').first();
    await expect(firstClue).toBeVisible({ timeout: 15_000 });
    await firstClue.click();

    await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });

    const cp0 = controllerPages[0] as Page;
    const cp1 = controllerPages[1] as Page;
    const firstSubmit = cp0.getByRole("button", { name: /^submit$/i }).first();
    const secondSubmit = cp1.getByRole("button", { name: /^submit$/i }).first();
    await expect(firstSubmit).toBeVisible({ timeout: 15_000 });
    await expect(secondSubmit).toBeVisible({ timeout: 15_000 });

    await cp0.getByRole("textbox").fill("an intentionally wrong answer");
    await cp1.getByRole("textbox").fill("another wrong answer");
    await firstSubmit.click();
    await secondSubmit.click();

    // Host skips answer resolution timer to tighten CI runtime.
    await skipButton.click();
    await expect(page.getByText(/correct answer/i)).toBeVisible({ timeout: 20_000 });

    // Clue result screen should show both submitted players.
    await expect(page.getByText("Alpha", { exact: true })).toBeVisible();
    await expect(page.getByText("Beta", { exact: true })).toBeVisible();

    // Advance back to clue-select and validate host controls remain available.
    await skipButton.click();
    await expect(page.getByRole("button", { name: /^end$/i })).toBeVisible();

    for (const controller of joined) {
      await controller.context.close();
    }
  });
});
