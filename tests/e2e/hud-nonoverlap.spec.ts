import { type Locator, type Page, expect, test } from "@playwright/test";

import {
  closeAllControllers,
  expectNoHorizontalOverflow,
  findLuckyLettersTurnActor,
  skipToPhase,
  startGame,
} from "./e2e-helpers";

type Viewport = { name: string; width: number; height: number };

const VIEWPORTS: Viewport[] = [
  { name: "desktop", width: 1600, height: 900 },
  { name: "mobile", width: 390, height: 844 },
  { name: "landscape", width: 667, height: 375 },
];

async function expectNoHudOverlap(page: Page, target: Locator): Promise<void> {
  const targetBox = await target.boundingBox();
  expect(targetBox).toBeTruthy();

  const docks = page.locator('[data-testid="hud-top"], [data-testid="hud-bottom"]');
  const dockCount = await docks.count();
  expect(dockCount).toBeGreaterThan(0);

  for (let i = 0; i < dockCount; i++) {
    const dockBox = await docks.nth(i).boundingBox();
    if (!dockBox || !targetBox) continue;

    const xOverlap = Math.max(
      0,
      Math.min(targetBox.x + targetBox.width, dockBox.x + dockBox.width) -
        Math.max(targetBox.x, dockBox.x),
    );
    const yOverlap = Math.max(
      0,
      Math.min(targetBox.y + targetBox.height, dockBox.y + dockBox.height) -
        Math.max(targetBox.y, dockBox.y),
    );

    expect(xOverlap * yOverlap).toBe(0);
  }
}

async function expectTopmostHitTarget(locator: Locator): Promise<void> {
  const isTopmost = await locator.evaluate((element) => {
    const target = element as HTMLElement;
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(centerX, centerY);
    return !!hit && (hit === target || target.contains(hit));
  });
  expect(isTopmost).toBe(true);
}

test.describe("HUD non-overlap", () => {
  test("Brain Board topic input stays clear of HUD docks", async ({ page, browser }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const { controllers } = await startGame(page, browser, {
        game: "Brain Board",
        complexity: "kids",
        playerNames: ["Ada", "Ben"],
      });

      try {
        await expect(page.getByText(/topic lab/i).first()).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('[data-testid="hud-top"]')).toHaveCount(1);
        await expect(page.locator('[data-testid="hud-bottom"]')).toHaveCount(0);
        await expectNoHorizontalOverflow(page);

        const controller = controllers[0]?.controllerPage;
        expect(controller).toBeTruthy();
        if (!controller) continue;

        await controller.setViewportSize({ width: viewport.width, height: viewport.height });
        const topicInput = controller.getByRole("textbox").first();
        await expect(topicInput).toBeVisible({ timeout: 15_000 });
        await topicInput.scrollIntoViewIfNeeded();
        await expectNoHudOverlap(controller, topicInput);
        await expectNoHorizontalOverflow(controller);
      } finally {
        await closeAllControllers(controllers);
      }
    }
  });

  test("Lucky Letters category submit stays clear of HUD docks", async ({ page, browser }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const { controllers } = await startGame(page, browser, {
        game: "Lucky Letters",
        complexity: "kids",
        playerNames: ["Ada", "Ben"],
      });

      try {
        await expect(page.locator('[data-testid="hud-top"]')).toHaveCount(1);
        await expect(page.locator('[data-testid="hud-bottom"]')).toHaveCount(0);
        await expectNoHorizontalOverflow(page);

        const controller = controllers[0]?.controllerPage;
        expect(controller).toBeTruthy();
        if (!controller) continue;

        await controller.setViewportSize({ width: viewport.width, height: viewport.height });
        const submitVote = controller.getByRole("button", { name: /submit vote/i });
        await expect(submitVote).toBeVisible({ timeout: 8_000 });
        await submitVote.scrollIntoViewIfNeeded();
        await expectNoHudOverlap(controller, submitVote);
        await expectNoHorizontalOverflow(controller);
      } finally {
        await closeAllControllers(controllers);
      }
    }
  });

  test("Lucky Letters solve action stays clear of HUD docks", async ({ page, browser }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const { controllers } = await startGame(page, browser, {
        game: "Lucky Letters",
        complexity: "kids",
        playerNames: ["Ada", "Ben"],
      });

      try {
        await skipToPhase(page, /choose your categories/i);
        await page.getByRole("button", { name: /^skip$/i }).click();
        await expect(page.locator('[data-testid="hud-top"]')).toHaveCount(1);
        await expect(page.locator('[data-testid="hud-bottom"]')).toHaveCount(0);
        await expectNoHorizontalOverflow(page);

        const { activePage } = await findLuckyLettersTurnActor(
          page,
          controllers.map((controller) => controller.controllerPage),
          ["Ada", "Ben"],
        );

        await activePage.setViewportSize({ width: viewport.width, height: viewport.height });
        const solveButton = activePage.getByRole("button", { name: /solve/i });
        await expect(solveButton).toBeVisible({ timeout: 10_000 });
        await expect(solveButton).toBeEnabled({ timeout: 10_000 });
        await expect(activePage.locator('[data-testid="hud-top"]')).toHaveCount(1);
        await expect(activePage.locator('[data-testid="hud-bottom"]')).toHaveCount(0);
        await solveButton.scrollIntoViewIfNeeded();
        await expectNoHudOverlap(activePage, solveButton);
        await solveButton.click({ trial: true });
        await expectTopmostHitTarget(solveButton);
        await expectNoHorizontalOverflow(activePage);
      } finally {
        await closeAllControllers(controllers);
      }
    }
  });

  test("Lucky Letters solve submit stays clear of HUD docks", async ({ page, browser }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const { controllers } = await startGame(page, browser, {
        game: "Lucky Letters",
        complexity: "kids",
        playerNames: ["Ada", "Ben"],
      });

      try {
        await skipToPhase(page, /choose your categories/i);
        await page.getByRole("button", { name: /^skip$/i }).click();

        const { activePage } = await findLuckyLettersTurnActor(
          page,
          controllers.map((controller) => controller.controllerPage),
          ["Ada", "Ben"],
        );
        await activePage.setViewportSize({ width: viewport.width, height: viewport.height });

        const appRoot = activePage.locator("main");
        const solveButton = appRoot.getByRole("button", { name: /solve/i });
        await expect(solveButton).toBeVisible({ timeout: 10_000 });
        await solveButton.click();

        const textbox = appRoot.getByRole("textbox").first();
        const submitButton = appRoot.getByRole("button", { name: /^submit$/i }).first();
        await expect(textbox).toBeVisible({ timeout: 10_000 });
        await expect(submitButton).toBeVisible({ timeout: 10_000 });
        await submitButton.scrollIntoViewIfNeeded();
        await expectNoHudOverlap(activePage, submitButton);
        await submitButton.click({ trial: true });
        await expectTopmostHitTarget(submitButton);
        await expectNoHorizontalOverflow(activePage);
      } finally {
        await closeAllControllers(controllers);
      }
    }
  });
});
