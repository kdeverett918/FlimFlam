import { type Page, expect, test } from "@playwright/test";

import {
  closeAllControllers,
  createRoom,
  joinControllersForRoom,
  waitForColyseusHealthy,
} from "./e2e-helpers";

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

async function expectNoAudioErrors(page: Page): Promise<void> {
  const events = await getAudioEvents(page);
  const errors = events.filter((event) => event.type === "audio.error");
  expect(errors).toHaveLength(0);
}

async function expectAudioEvent(page: Page, eventType: string): Promise<void> {
  await expect
    .poll(async () => {
      const events = await getAudioEvents(page);
      return events.some((event) => event.type === eventType);
    })
    .toBe(true);
}

async function openOrToggleAudioControl(page: Page) {
  const toggle = page.getByRole("button", { name: /mute audio|unmute audio/i });
  await expect(toggle).toBeVisible({ timeout: 10_000 });
  await toggle.click();
  return toggle;
}

async function startGameFromLobby(page: Page, game: string) {
  await page.getByRole("button", { name: new RegExp(`^${game}$`, "i") }).click();
  await page.getByRole("button", { name: /^kids/i }).click();
  const startButton = page.getByRole("button", {
    name: /start game|start the game|waiting for players/i,
  });
  await expect(startButton).toBeEnabled({ timeout: 30_000 });
  await startButton.click();
  await expect(page.getByRole("button", { name: /^skip$/i })).toBeVisible({ timeout: 30_000 });
}

test.describe("Audio Unlock And BGM", () => {
  // @ts-expect-error reducedMotion is a valid Playwright option
  test.use({ reducedMotion: "reduce" });

  test("requires explicit unlock and persists mute state", async ({ page }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    await createRoom(page);

    await expectAudioEvent(page, "audio.locked");
    let events = await getAudioEvents(page);
    expect(events.some((event) => event.type === "music.play")).toBe(false);

    // Reduced motion should not force initial mute.
    await expect(page.getByRole("button", { name: /^mute audio$/i })).toBeVisible({
      timeout: 10_000,
    });

    // First interaction must unlock audio.
    await openOrToggleAudioControl(page);
    await expectAudioEvent(page, "audio.unlocked");
    await expectNoAudioErrors(page);

    // Toggle mute on and off and verify hooks.
    await openOrToggleAudioControl(page);
    await expectAudioEvent(page, "audio.mute.on");
    await expect(page.getByRole("button", { name: /^unmute audio$/i })).toBeVisible({
      timeout: 10_000,
    });

    await openOrToggleAudioControl(page);
    await expectAudioEvent(page, "audio.mute.off");
    await expect(page.getByRole("button", { name: /^mute audio$/i })).toBeVisible({
      timeout: 10_000,
    });

    // Leave muted before reload to verify persistence.
    await openOrToggleAudioControl(page);
    await expectAudioEvent(page, "audio.mute.on");
    await expect(page.getByRole("button", { name: /^unmute audio$/i })).toBeVisible({
      timeout: 10_000,
    });

    const beforeReloadEvents = await getAudioEvents(page);
    expect(beforeReloadEvents.some((event) => event.type === "audio.mute.on")).toBe(true);
    expect(beforeReloadEvents.some((event) => event.type === "audio.mute.off")).toBe(true);

    await page.reload();
    await expect(page.getByRole("button", { name: /^unmute audio$/i })).toBeVisible({
      timeout: 15_000,
    });

    events = await getAudioEvents(page);
    await expectNoAudioErrors(page);
  });

  test("logs per-game music play and bounded crossfades", async ({ page, browser }) => {
    test.setTimeout(240_000);

    const requiredThemes = ["survey-smash", "lucky-letters", "brain-board"];
    const allEvents: AudioEvent[] = [];
    const gameMatrix = [
      { name: "Survey Smash", slug: "survey-smash" },
      { name: "Lucky Letters", slug: "lucky-letters" },
      { name: "Brain Board", slug: "brain-board" },
    ] as const;

    for (let index = 0; index < gameMatrix.length; index += 1) {
      const game = gameMatrix[index] as (typeof gameMatrix)[number];
      await page.goto("/");
      await waitForColyseusHealthy(page);

      const { code } = await createRoom(page);
      const controllers = await joinControllersForRoom(browser, page, code, [
        `AudioE2E-${index + 1}-A`,
        `AudioE2E-${index + 1}-B`,
      ]);

      await openOrToggleAudioControl(page);
      await expectAudioEvent(page, "audio.unlocked");
      await clearAudioEvents(page);

      await startGameFromLobby(page, game.name);
      await expect
        .poll(async () => {
          const events = await getAudioEvents(page);
          return events.some(
            (event) => event.type === "music.play" && event.payload?.theme === game.slug,
          );
        })
        .toBe(true);

      const events = await getAudioEvents(page);
      allEvents.push(...events);
      await expectNoAudioErrors(page);
      await closeAllControllers(controllers);
    }

    const playedThemes = new Set(
      allEvents
        .filter((event) => event.type === "music.play")
        .map((event) => String(event.payload?.theme ?? "")),
    );
    for (const theme of requiredThemes) {
      expect(playedThemes.has(theme)).toBe(true);
    }

    const crossfadeEvents = allEvents.filter((event) => event.type === "music.crossfade");
    expect(crossfadeEvents.length).toBeGreaterThan(0);

    const maxConcurrent = allEvents.reduce((max, event) => {
      const raw = event.payload?.concurrentTracks;
      const count = typeof raw === "number" ? raw : 0;
      return Math.max(max, count);
    }, 0);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });
});
