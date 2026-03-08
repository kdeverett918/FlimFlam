import { expect, test } from "@playwright/test";

import {
  closeAllControllers,
  driveBrainBoardToPhase,
  driveLuckyLettersToActionableTurn,
  expectNoHorizontalOverflow,
  findBrainBoardSelector,
  startGame,
} from "./e2e-helpers";

const LANDSCAPE_VIEWPORT = { width: 667, height: 375 } as const;

test.describe("GameBoard Landscape Contract", () => {
  test.describe.configure({ timeout: 240_000 });

  test("Brain Board landscape keeps hero surface usable and clue actions visible", async ({
    page,
    browser,
  }) => {
    await page.setViewportSize(LANDSCAPE_VIEWPORT);
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      for (const controllerPage of controllerPages) {
        await controllerPage.setViewportSize(LANDSCAPE_VIEWPORT);
      }

      const heroSurface = page.locator('[data-testid="hero-surface"]').first();
      await expect(heroSurface).toBeVisible({ timeout: 20_000 });
      const heroBox = await heroSurface.boundingBox();
      expect(heroBox).not.toBeNull();
      if (heroBox) {
        expect(heroBox.height).toBeGreaterThan(100);
      }

      await expectNoHorizontalOverflow(page);
      for (const controllerPage of controllerPages) {
        await expectNoHorizontalOverflow(controllerPage);
      }

      await driveBrainBoardToPhase(page, controllerPages, /'s pick|selector is picking/i, 900);

      const selector = await findBrainBoardSelector(page, controllerPages, 20_000);
      const firstEnabledClue = selector.locator('button[aria-label*=" for "]:enabled').first();
      await expect(firstEnabledClue).toBeVisible({ timeout: 20_000 });
      await firstEnabledClue.scrollIntoViewIfNeeded();

      const clueBox = await firstEnabledClue.boundingBox();
      expect(clueBox).not.toBeNull();
      if (clueBox) {
        expect(clueBox.y).toBeGreaterThanOrEqual(0);
        expect(clueBox.y + clueBox.height).toBeLessThanOrEqual(LANDSCAPE_VIEWPORT.height);
      }
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("Lucky Letters landscape keeps hero surface usable and spin CTA tappable", async ({
    page,
    browser,
  }) => {
    await page.setViewportSize(LANDSCAPE_VIEWPORT);
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      for (const controllerPage of controllerPages) {
        await controllerPage.setViewportSize(LANDSCAPE_VIEWPORT);
      }

      const heroSurface = page.locator('[data-testid="hero-surface"]').first();
      await expect(heroSurface).toBeVisible({ timeout: 20_000 });
      const heroBox = await heroSurface.boundingBox();
      expect(heroBox).not.toBeNull();
      if (heroBox) {
        expect(heroBox.height).toBeGreaterThan(100);
      }

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

      const spinButtonBox = await spinButton.boundingBox();
      expect(spinButtonBox).not.toBeNull();
      if (spinButtonBox) {
        expect(spinButtonBox.y).toBeGreaterThanOrEqual(0);
        expect(spinButtonBox.y + spinButtonBox.height).toBeLessThanOrEqual(
          LANDSCAPE_VIEWPORT.height,
        );
      }

      await spinButton.click();
      await expect(watchingPage.locator('[data-testid="lucky-mobile-wheel"]')).toBeVisible({
        timeout: 15_000,
      });

      await expectNoHorizontalOverflow(page);
      await expectNoHorizontalOverflow(activePage);
      await expectNoHorizontalOverflow(watchingPage);
    } finally {
      await closeAllControllers(controllers);
    }
  });
});
