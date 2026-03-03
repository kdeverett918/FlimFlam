import { type Page, expect, test } from "@playwright/test";

import {
  createRoom,
  joinControllersForRoom,
  selectGameAndStart,
  waitForColyseusHealthy,
} from "./e2e-helpers";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getSelector(controllers: Page[]): Promise<{ page: Page; index: number }> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    for (let i = 0; i < controllers.length; i++) {
      const clue = controllers[i].locator('button[aria-label*=" for "]:enabled').first();
      if (await clue.isVisible().catch(() => false)) {
        return { page: controllers[i], index: i };
      }
    }
    await controllers[0]?.waitForTimeout(200);
  }
  throw new Error("No active selector found");
}

test("brain board rotates selector and persists revealed clues", async ({ page, browser }) => {
  await page.goto("/");
  await waitForColyseusHealthy(page);

  const { code } = await createRoom(page);
  const joined = await joinControllersForRoom(browser, page, code, ["Rae", "Sky"]);
  const controllers = joined.map((c) => c.controllerPage);

  await selectGameAndStart(page, { gameName: "Brain Board", complexity: "kids" });

  const skipButton = page.getByRole("button", { name: /^skip$/i });
  await skipButton.click(); // category-reveal -> clue-select

  const firstSelector = await getSelector(controllers);
  const firstClue = firstSelector.page.locator('button[aria-label*=" for "]:enabled').first();
  const firstLabel = await firstClue.getAttribute("aria-label");
  await firstClue.click();

  await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });
  await skipButton.click(); // answering -> clue-result
  await skipButton.click(); // clue-result -> clue-select

  const nextSelector = await getSelector(controllers);
  expect(nextSelector.index).not.toBe(firstSelector.index);

  // Revealed clues should remain unavailable when selector changes.
  if (firstLabel) {
    const consumed = nextSelector.page.getByRole("button", {
      name: new RegExp(`^${escapeRegex(firstLabel)}$`, "i"),
    });
    await expect(consumed).toBeDisabled();
  }

  for (const controller of joined) {
    await controller.context.close();
  }
});
