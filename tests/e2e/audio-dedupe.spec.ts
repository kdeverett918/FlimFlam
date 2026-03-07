import { type Page, expect, test } from "@playwright/test";

import { closeAllControllers, findLuckyLettersTurnActor, startGame } from "./e2e-helpers";

type AudioEvent = { ts: number; type: string; payload?: Record<string, unknown> };

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

async function unlockAudio(page: Page): Promise<void> {
  const volumeButton = page.getByRole("button", { name: /mute audio|unmute audio/i });
  await expect(volumeButton).toBeVisible({ timeout: 10_000 });
  await volumeButton.click();
  await expect
    .poll(async () => {
      const events = await getAudioEvents(page);
      return events.some((event) => event.type === "audio.unlocked");
    })
    .toBe(true);
}

function countEvents(events: AudioEvent[], type: string): number {
  return events.filter((event) => event.type === type).length;
}

test.describe("Audio Dedupe Contracts", () => {
  // @ts-expect-error reducedMotion is a valid Playwright option
  test.use({ reducedMotion: "reduce" });
  test.describe.configure({ timeout: 300_000 });
  test.skip(process.env.NEXT_PUBLIC_FLIMFLAM_E2E !== "1", "Requires NEXT_PUBLIC_FLIMFLAM_E2E=1");

  test("micro transitions stay silent and spin cue does not duplicate", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });
    const controllerPages = controllers.map((controller) => controller.controllerPage);

    try {
      await unlockAudio(page);
      await expect(page.getByText(/round 1/i)).toBeVisible({ timeout: 30_000 });

      // Contract: round-intro -> spinning is a micro transition and should not emit macro whoosh/reveal.
      await clearAudioEvents(page);
      await page.getByRole("button", { name: /^skip$/i }).click();
      const { activePage } = await findLuckyLettersTurnActor(page, controllerPages, ["Ada", "Ben"]);

      const transitionEvents = await getAudioEvents(page);
      expect(
        countEvents(transitionEvents, "audio.game:whoosh"),
        "micro transition emitted unexpected whoosh",
      ).toBe(0);
      expect(
        countEvents(transitionEvents, "audio.game:reveal"),
        "micro transition emitted unexpected reveal",
      ).toBe(0);

      await clearAudioEvents(page);
      await activePage
        .getByRole("button", { name: /spin the wheel/i })
        .first()
        .click();

      await expect
        .poll(
          async () => {
            const events = await getAudioEvents(page);
            return events.some((event) => /^audio\.lucky\.prize\./.test(event.type));
          },
          { timeout: 20_000, interval: 250 },
        )
        .toBe(true);

      const spinEvents = await getAudioEvents(page);
      const prizeEventCount = spinEvents.filter((event) =>
        /^audio\.lucky\.prize\./.test(event.type),
      ).length;
      expect(prizeEventCount, "single spin emitted duplicate prize SFX").toBe(1);
    } finally {
      await closeAllControllers(controllers);
    }
  });

  test("reconnect does not spam whoosh/reveal", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Lucky Letters",
      complexity: "kids",
      playerNames: ["Ada", "Ben"],
    });
    const controllerPages = controllers.map((controller) => controller.controllerPage);

    try {
      await unlockAudio(page);
      await expect(page.getByText(/round 1/i)).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: /^skip$/i }).click();
      await findLuckyLettersTurnActor(page, controllerPages, ["Ada", "Ben"]);

      await clearAudioEvents(page);
      await page.context().setOffline(true);
      await expect
        .poll(
          async () =>
            page
              .getByText(/reconnecting/i)
              .first()
              .isVisible()
              .catch(() => false),
          { timeout: 10_000, interval: 250 },
        )
        .toBe(true);
      await page.context().setOffline(false);
      await findLuckyLettersTurnActor(page, controllerPages, ["Ada", "Ben"]);

      await expect
        .poll(
          async () => {
            const events = await getAudioEvents(page);
            return events.length;
          },
          { timeout: 20_000, interval: 250 },
        )
        .toBeGreaterThanOrEqual(0);

      const reconnectEvents = await getAudioEvents(page);
      expect(
        countEvents(reconnectEvents, "audio.game:whoosh"),
        "reconnect should not spam whoosh",
      ).toBeLessThanOrEqual(1);
      expect(
        countEvents(reconnectEvents, "audio.game:reveal"),
        "reconnect should not spam reveal",
      ).toBeLessThanOrEqual(1);
    } finally {
      await page
        .context()
        .setOffline(false)
        .catch(() => undefined);
      await closeAllControllers(controllers);
    }
  });
});
