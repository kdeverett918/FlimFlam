import { type Locator, type Page, expect, test } from "@playwright/test";

import {
  closeAllControllers,
  driveBrainBoardToPhase,
  driveLuckyLettersToActionableTurn,
  expectNoHorizontalOverflow,
  startGame,
} from "./e2e-helpers";

type Viewport = {
  name: string;
  width: number;
  height: number;
};

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const VIEWPORTS: Viewport[] = [
  { name: "desktop", width: 1600, height: 900 },
  { name: "mobile", width: 390, height: 844 },
  { name: "landscape", width: 667, height: 375 },
];

const HUD_ROOT = '[data-testid="hud-root"]';
const HUD_TOP = '[data-testid="hud-top"]';
const HUD_BOTTOM = '[data-testid="hud-bottom"]';
const HUD_FLOATING = '[data-testid="hud-floating"]';
const HERO_SURFACE = '[data-testid="hero-surface"]';
const TIMER_ROOT = '[data-testid="timer-root"]';
const TIMER_PROGRESS = '[data-testid="timer-progress"]';

function intersectsWithTolerance(a: Box, b: Box, tolerancePx = 1): boolean {
  const xOverlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const yOverlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return xOverlap > tolerancePx && yOverlap > tolerancePx;
}

async function visibleBox(page: Page, selector: string): Promise<Box | null> {
  const locator = page.locator(selector).first();
  const isVisible = await locator.isVisible().catch(() => false);
  if (!isVisible) return null;
  const box = await locator.boundingBox();
  if (!box) return null;
  return box;
}

async function visibleLocatorBox(target: Locator): Promise<Box | null> {
  const isVisible = await target.isVisible().catch(() => false);
  if (!isVisible) return null;
  const box = await target.boundingBox();
  if (!box) return null;
  return box;
}

async function expectHeroSurfaceClearOfHud(page: Page): Promise<void> {
  const hero = await visibleBox(page, HERO_SURFACE);
  expect(hero).not.toBeNull();
  if (!hero) return;

  for (const regionSelector of [HUD_TOP, HUD_BOTTOM, HUD_FLOATING]) {
    const hudRegion = await visibleBox(page, regionSelector);
    if (!hudRegion) continue;
    expect(intersectsWithTolerance(hero, hudRegion, 1)).toBe(false);
  }
}

async function expectTargetClearOfHud(
  page: Page,
  target: Locator,
  hudSelectors: string[],
): Promise<void> {
  const targetBox = await visibleLocatorBox(target);
  expect(targetBox).not.toBeNull();
  if (!targetBox) return;

  for (const selector of hudSelectors) {
    const hudBox = await visibleBox(page, selector);
    if (!hudBox) continue;
    expect(intersectsWithTolerance(targetBox, hudBox, 1)).toBe(false);
  }
}

async function expectBottomHiddenOrCollapsed(page: Page): Promise<void> {
  const bottom = page.locator(HUD_BOTTOM).first();
  const count = await page.locator(HUD_BOTTOM).count();
  if (count === 0) {
    expect(count).toBe(0);
    return;
  }

  const isVisible = await bottom.isVisible().catch(() => false);
  if (!isVisible) return;

  const box = await bottom.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    expect(box.height).toBeLessThanOrEqual(1);
  }
}

async function expectNoDuplicateTimerSignals(page: Page): Promise<void> {
  const timerCount = await page.locator(TIMER_ROOT).count();
  expect(timerCount).toBeLessThanOrEqual(1);
  if (timerCount === 1) {
    await expect(page.locator(TIMER_PROGRESS).first()).toBeVisible();
  }
}

test.describe("HUD Safe Zones Contract", () => {
  test.describe.configure({ timeout: 420_000 });

  test("Brain Board respects HUD safe-zones across required viewports", async ({
    page,
    browser,
  }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const { controllers } = await startGame(page, browser, {
        game: "Brain Board",
        complexity: "kids",
        playerNames: ["Ada", "Ben"],
      });

      try {
        const controllerPage = controllers[0]?.controllerPage;
        expect(controllerPage).toBeTruthy();
        if (!controllerPage) continue;

        await controllerPage.setViewportSize({ width: viewport.width, height: viewport.height });

        await expect(page.locator(HUD_ROOT)).toHaveCount(1);
        await expect(controllerPage.locator(HUD_ROOT)).toHaveCount(1);
        await expect(page.locator(HUD_TOP)).toHaveCount(1);
        await expect(controllerPage.locator(HUD_TOP)).toHaveCount(1);

        await expect(page.getByText(/topic lab/i).first()).toBeVisible({ timeout: 20_000 });
        await expect(controllerPage.getByText(/topic lab/i).first()).toBeVisible({
          timeout: 20_000,
        });

        await expectBottomHiddenOrCollapsed(page);
        await expectBottomHiddenOrCollapsed(controllerPage);
        await expect(page.locator(HUD_FLOATING)).toHaveCount(0);
        await expect(controllerPage.locator(HUD_FLOATING)).toHaveCount(0);
        await expectNoDuplicateTimerSignals(page);
        await expectNoDuplicateTimerSignals(controllerPage);
        await expectHeroSurfaceClearOfHud(page);
        await expectHeroSurfaceClearOfHud(controllerPage);
        await expectNoHorizontalOverflow(page);
        await expectNoHorizontalOverflow(controllerPage);

        let hostSawGenerating = false;
        let controllerSawGenerating = false;
        await page.getByRole("button", { name: /^skip$/i }).click();
        await expect
          .poll(
            async () => {
              hostSawGenerating =
                hostSawGenerating ||
                (await page
                  .getByText(/building your board/i)
                  .first()
                  .isVisible()
                  .catch(() => false));
              controllerSawGenerating =
                controllerSawGenerating ||
                (await controllerPage
                  .getByText(/building your board/i)
                  .first()
                  .isVisible()
                  .catch(() => false));
              return hostSawGenerating && controllerSawGenerating;
            },
            { timeout: 45_000, interval: 250 },
          )
          .toBe(true);

        await driveBrainBoardToPhase(
          page,
          controllers.map((controller) => controller.controllerPage),
          /everyone is answering/i,
          900,
        );

        await expect(page.locator(HUD_TOP)).toHaveCount(1);
        await expect(controllerPage.locator(HUD_TOP)).toHaveCount(1);
        await expect(page.locator(HUD_BOTTOM)).toHaveCount(1);
        await expect(controllerPage.locator(HUD_BOTTOM)).toHaveCount(1);
        await expect(page.locator(TIMER_ROOT)).toBeVisible({ timeout: 15_000 });
        await expect(controllerPage.locator(TIMER_ROOT)).toBeVisible({ timeout: 15_000 });
        await expect(page.locator(TIMER_PROGRESS)).toBeVisible({ timeout: 15_000 });
        await expect(controllerPage.locator(TIMER_PROGRESS)).toBeVisible({ timeout: 15_000 });

        await expectHeroSurfaceClearOfHud(page);
        await expectHeroSurfaceClearOfHud(controllerPage);
      } finally {
        await closeAllControllers(controllers);
      }
    }
  });

  test("Lucky Letters keeps CTA/input clear of HUD regions across required viewports", async ({
    page,
    browser,
  }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const { controllers } = await startGame(page, browser, {
        game: "Lucky Letters",
        complexity: "kids",
        playerNames: ["Ada", "Ben"],
      });

      try {
        const controllerPages = controllers.map((controller) => controller.controllerPage);
        for (const controllerPage of controllerPages) {
          await controllerPage.setViewportSize({ width: viewport.width, height: viewport.height });
        }

        const firstController = controllerPages[0];
        expect(firstController).toBeTruthy();
        if (!firstController) continue;

        await expect(page.locator(HUD_ROOT)).toHaveCount(1);
        await expect(firstController.locator(HUD_ROOT)).toHaveCount(1);
        await expect(page.locator(HUD_TOP)).toHaveCount(1);
        await expect(firstController.locator(HUD_TOP)).toHaveCount(1);
        await expect(page.locator(HUD_FLOATING)).toHaveCount(0);
        await expect(firstController.locator(HUD_FLOATING)).toHaveCount(0);
        await expectBottomHiddenOrCollapsed(page);
        await expectBottomHiddenOrCollapsed(firstController);
        await expectHeroSurfaceClearOfHud(page);
        await expectHeroSurfaceClearOfHud(firstController);

        await expect
          .poll(
            async () =>
              (await page
                .locator('[data-testid="lucky-host-state"]')
                .first()
                .getAttribute("data-phase")) ?? "",
            { timeout: 30_000 },
          )
          .toBe("category-vote");
        await page.getByRole("button", { name: /^skip$/i }).click();
        const { activePage, watchingPage } = await driveLuckyLettersToActionableTurn(
          page,
          controllerPages,
          ["Ada", "Ben"],
          240,
        );
        const spinButton = activePage.getByRole("button", { name: /spin the wheel/i }).first();
        await expect(spinButton).toBeVisible({ timeout: 15_000 });
        await expect(spinButton).toBeEnabled({ timeout: 15_000 });

        await expect(page.locator(HUD_TOP)).toHaveCount(1);
        await expect(activePage.locator(HUD_TOP)).toHaveCount(1);
        await expect(page.locator(HUD_BOTTOM)).toHaveCount(1);
        await expect(activePage.locator(HUD_BOTTOM)).toHaveCount(1);

        await expectTargetClearOfHud(activePage, spinButton, [HUD_BOTTOM, HUD_FLOATING]);
        await expectHeroSurfaceClearOfHud(page);
        await expectHeroSurfaceClearOfHud(activePage);

        const solveButton = activePage.getByRole("button", { name: /^solve$/i }).first();
        await expect(solveButton).toBeVisible({ timeout: 10_000 });
        await solveButton.click();

        const solveTextbox = activePage.getByRole("textbox").first();
        await expect(solveTextbox).toBeVisible({ timeout: 10_000 });
        await solveTextbox.focus();

        await expect(page.locator(HUD_TOP)).toHaveCount(1);
        await expect(activePage.locator(HUD_TOP)).toHaveCount(1);
        await expect(page.locator(HUD_BOTTOM)).toHaveCount(1);
        await expect(activePage.locator(HUD_BOTTOM)).toHaveCount(1);

        await expectTargetClearOfHud(activePage, solveTextbox, [HUD_BOTTOM, HUD_FLOATING]);
        await expect(watchingPage.locator('[data-testid="lucky-mobile-wheel"]')).toBeVisible({
          timeout: 15_000,
        });

        await expectNoHorizontalOverflow(page);
        await expectNoHorizontalOverflow(activePage);
        await expectNoHorizontalOverflow(watchingPage);
      } finally {
        await closeAllControllers(controllers);
      }
    }
  });
});
