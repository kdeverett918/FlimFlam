import { type Page, expect, test } from "@playwright/test";

import { closeAllControllers, findLuckyLettersTurnActor, startGame } from "./e2e-helpers";

type AudioEvent = {
  ts: number;
  type: string;
  payload?: Record<string, unknown>;
};

async function getAudioEvents(page: Page): Promise<AudioEvent[]> {
  return page.evaluate(() => {
    return (window.__FLIMFLAM_E2E__?.audioEvents ?? []) as AudioEvent[];
  });
}

async function clearAudioEvents(page: Page): Promise<void> {
  await page.evaluate(() => {
    const store = window.__FLIMFLAM_E2E__;
    if (!store?.audioEvents) return;
    store.audioEvents.length = 0;
  });
}

test.describe("Audio Feedback Contract", () => {
  test.describe.configure({ timeout: 300_000 });
  test.skip(process.env.NEXT_PUBLIC_FLIMFLAM_E2E !== "1", "Requires NEXT_PUBLIC_FLIMFLAM_E2E=1");

  test("emits unlock, lucky prize, and brain board reveal audio events", async ({
    page,
    browser,
  }) => {
    const brainBoardStart = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Ari", "Bea"],
    });

    try {
      await expect
        .poll(
          async () => {
            const events = await getAudioEvents(page);
            return events.some((event) => event.type === "audio.unlocked");
          },
          { timeout: 20_000, interval: 250 },
        )
        .toBe(true);
    } finally {
      await closeAllControllers(brainBoardStart.controllers);
    }

    const luckyLettersStart = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ari", "Bea"],
    });

    try {
      await clearAudioEvents(page);

      await expect(page.getByText(/round 1/i)).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: /^skip$/i }).click();

      const controllerPages = luckyLettersStart.controllers.map(
        (controller) => controller.controllerPage,
      );
      const { activePage, watchingPage } = await findLuckyLettersTurnActor(page, controllerPages, [
        "Ari",
        "Bea",
      ]);

      await activePage
        .getByRole("button", { name: /spin the wheel/i })
        .first()
        .click();
      await expect(watchingPage.locator('[data-testid="lucky-mobile-wheel"]')).toBeVisible({
        timeout: 15_000,
      });

      await expect
        .poll(
          async () => {
            const events = await getAudioEvents(page);
            return events.some((event) => /^audio\.lucky\.prize\./.test(event.type));
          },
          { timeout: 20_000, interval: 250 },
        )
        .toBe(true);
    } finally {
      await closeAllControllers(luckyLettersStart.controllers);
    }

    const brainBoardRevealStart = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Ari", "Bea"],
    });

    try {
      await clearAudioEvents(page);
      await page.getByRole("button", { name: /^skip$/i }).click();

      await expect
        .poll(
          async () => {
            const events = await getAudioEvents(page);
            return events.some((event) => event.type === "audio.brain.board.reveal");
          },
          { timeout: 45_000, interval: 250 },
        )
        .toBe(true);
    } finally {
      await closeAllControllers(brainBoardRevealStart.controllers);
    }
  });
});
