import { type Page, expect, test } from "@playwright/test";

import { closeAllControllers, startGame } from "./e2e-helpers";

type MotionEvent = { type: string };

async function findLuckyLettersActiveController(controllerPages: Page[]): Promise<Page> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    for (const controllerPage of controllerPages) {
      const spinButton = controllerPage.getByRole("button", { name: /spin the wheel/i });
      if (await spinButton.isVisible().catch(() => false)) {
        return controllerPage;
      }
    }
    await controllerPages[0]?.waitForTimeout(150);
  }
  throw new Error("Timed out waiting for Lucky Letters active controller");
}

async function clickAnySpinButton(controllerPages: Page[]): Promise<boolean> {
  for (const controllerPage of controllerPages) {
    const spinButton = controllerPage.getByRole("button", { name: /spin the wheel/i }).first();
    if (
      (await spinButton.isVisible().catch(() => false)) &&
      (await spinButton.isEnabled().catch(() => false))
    ) {
      await spinButton.click().catch(() => {});
      return true;
    }
  }
  return false;
}

async function observeLuckyLettersRevealStyle(
  page: Page,
  controllerPages: Page[],
): Promise<string> {
  const deadline = Date.now() + 40_000;
  const skipButton = page.getByRole("button", { name: /^skip$/i });
  const fadeTiles = page.locator('[data-testid="lucky-letter-tile"][data-reveal-style="fade"]');
  const flipTiles = page.locator('[data-testid="lucky-letter-tile"][data-reveal-style="flip"]');
  const anyStyledTile = page.locator('[data-testid="lucky-letter-tile"][data-reveal-style]');

  while (Date.now() < deadline) {
    if (
      await fadeTiles
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return "fade";
    }
    if (
      await flipTiles
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return "flip";
    }

    const styledTileCount = await anyStyledTile.count().catch(() => 0);
    if (styledTileCount > 0) {
      const revealStyle = await anyStyledTile
        .first()
        .getAttribute("data-reveal-style")
        .catch(() => null);
      if (revealStyle === "fade" || revealStyle === "flip") {
        return revealStyle;
      }
    }

    const inRoundIntro = await page
      .getByText(/^round \d+$/i)
      .first()
      .isVisible()
      .catch(() => false);
    const inRoundResult = await page
      .getByText(/round complete|round \d+ complete/i)
      .first()
      .isVisible()
      .catch(() => false);
    if ((inRoundIntro || inRoundResult) && (await skipButton.isVisible().catch(() => false))) {
      await skipButton.click().catch(() => {});
      await page.waitForTimeout(180);
      continue;
    }

    const spun = await clickAnySpinButton(controllerPages);
    await page.waitForTimeout(spun ? 220 : 140);
  }

  throw new Error("Timed out waiting to observe Lucky Letters tile reveal style");
}

async function getMotionEvents(page: Page): Promise<MotionEvent[]> {
  return page.evaluate(() => {
    return (window.__FLIMFLAM_E2E__?.motionEvents as MotionEvent[] | undefined) ?? [];
  });
}

async function clearMotionEvents(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (!window.__FLIMFLAM_E2E__?.motionEvents) return;
    window.__FLIMFLAM_E2E__.motionEvents.length = 0;
  });
}

async function expectNoAudioErrors(page: Page): Promise<void> {
  const errorCount = await page.evaluate(() => {
    return (
      window.__FLIMFLAM_E2E__?.audioEvents?.filter((event) => event.type === "audio.error")
        .length ?? 0
    );
  });
  expect(errorCount).toBe(0);
}

async function skipRoundIntro(page: Page): Promise<void> {
  await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /^skip$/i }).click();
}

test.describe("Lucky Letters Polish", () => {
  test("wheel has 24 segments and emits one start/stop spin event per spin", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      await skipRoundIntro(page);

      await expect(page.locator('[data-testid="lucky-wheel"]')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('[data-testid="lucky-wheel-segment"]')).toHaveCount(24);

      await clearMotionEvents(page);
      const activeController = await findLuckyLettersActiveController(controllerPages);
      await activeController.getByRole("button", { name: /spin the wheel/i }).click();

      await expect
        .poll(async () => {
          const events = await getMotionEvents(page);
          const starts = events.filter((event) => event.type === "lucky.wheel.spin.start").length;
          const stops = events.filter((event) => event.type === "lucky.wheel.spin.stop").length;
          return { starts, stops };
        })
        .toEqual({ starts: 1, stops: 1 });

      await expect(
        page.locator('[data-testid="lucky-letter-tile"][data-reveal-style="flip"]').first(),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.locator('[data-testid="lucky-letter-tile"][data-reveal-style="fade"]'),
      ).toHaveCount(0);

      await expectNoAudioErrors(page);
    } finally {
      await closeAllControllers(controllers);
    }
  });
});

test.describe("Lucky Letters Polish (Reduced Motion)", () => {
  test.use({ reducedMotion: "reduce" });

  test("letter tiles use fade reveal style in reduced motion", async ({ page, browser }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      await skipRoundIntro(page);
      const revealStyle = await observeLuckyLettersRevealStyle(page, controllerPages);
      expect(revealStyle).toBe("fade");
      await expectNoAudioErrors(page);
    } finally {
      await closeAllControllers(controllers);
    }
  });
});
