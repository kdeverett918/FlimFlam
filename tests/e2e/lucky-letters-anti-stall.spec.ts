import { expect, test } from "@playwright/test";

import { closeAllControllers, findLuckyLettersTurnActor, startGame } from "./e2e-helpers";

test.describe("Lucky Letters Anti-Stall", () => {
  test.describe.configure({ timeout: 180_000 });

  test("idle spinning shows timeout banner, advances turn, and preserves spectator parity", async ({
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

      await expect(page.getByText(/round 1/i)).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: /^skip$/i }).click();

      const initialTurn = await findLuckyLettersTurnActor(page, controllerPages, ["Ada", "Ben"]);
      const { activePage, watchingPage } = initialTurn;

      await expect(activePage.getByRole("button", { name: /spin the wheel/i })).toBeVisible({
        timeout: 10_000,
      });
      await expect(watchingPage.locator('[data-testid="lucky-mobile-wheel"]')).toBeVisible({
        timeout: 15_000,
      });

      await expect(page.locator('[data-testid="lucky-timeout-banner"]').first()).toBeVisible({
        timeout: 15_000,
      });

      await expect
        .poll(
          async () => {
            let visibleControllers = 0;
            for (const controllerPage of controllerPages) {
              const visible = await controllerPage
                .locator('[data-testid="lucky-timeout-banner"]')
                .first()
                .isVisible()
                .catch(() => false);
              if (visible) visibleControllers += 1;
            }
            return visibleControllers;
          },
          { timeout: 15_000, interval: 250 },
        )
        .toBeGreaterThan(0);

      await expect
        .poll(
          async () => {
            const nextTurn = await findLuckyLettersTurnActor(
              page,
              controllerPages,
              ["Ada", "Ben"],
              2_500,
            ).catch(() => null);
            if (!nextTurn) return false;
            return (
              nextTurn.mode !== initialTurn.mode ||
              nextTurn.activeKind !== initialTurn.activeKind ||
              nextTurn.activeName !== initialTurn.activeName
            );
          },
          { timeout: 15_000, interval: 250 },
        )
        .toBe(true);

      await expect(watchingPage.locator('[data-testid="lucky-mobile-wheel"]')).toBeVisible({
        timeout: 15_000,
      });
      await expect(watchingPage.locator('[data-testid="lucky-prize-label"]')).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await closeAllControllers(controllers);
    }
  });
});
