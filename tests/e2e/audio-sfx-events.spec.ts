import { type Page, expect, test } from "@playwright/test";

import {
  closeAllControllers,
  findBrainBoardSelectorController,
  startGame,
  submitTextAnswer,
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

async function unlockAudio(page: Page): Promise<void> {
  const volumeBtn = page.getByRole("button", { name: /mute audio|unmute audio/i });
  await expect(volumeBtn).toBeVisible({ timeout: 10_000 });
  await volumeBtn.click();

  // Wait for unlock event
  await expect
    .poll(async () => {
      const events = await getAudioEvents(page);
      return events.some((event) => event.type === "audio.unlocked");
    })
    .toBe(true);
}

async function expectNoAudioErrors(page: Page): Promise<void> {
  const events = await getAudioEvents(page);
  const errors = events.filter((event) => event.type === "audio.error");
  expect(errors).toHaveLength(0);
}

test.describe("Audio SFX Events During Gameplay", () => {
  // @ts-expect-error reducedMotion is a valid Playwright option
  test.use({ reducedMotion: "reduce" });

  test("brain board emits music.play with correct theme on game start", async ({
    page,
    browser,
  }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Ari", "Bea"],
    });

    await unlockAudio(page);
    await clearAudioEvents(page);

    // Music should be playing with brain-board theme
    await expect
      .poll(async () => {
        const events = await getAudioEvents(page);
        return events.some(
          (event) => event.type === "music.play" && event.payload?.theme === "brain-board",
        );
      })
      .toBe(true);

    await expectNoAudioErrors(page);
    await closeAllControllers(controllers);
  });

  test("phase transition does not produce audio errors", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Alpha", "Beta"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);

    await unlockAudio(page);
    await clearAudioEvents(page);

    const skipButton = page.getByRole("button", { name: /^skip$/i });

    // Skip through category-reveal -> clue-select
    await skipButton.click();

    const selector = await findBrainBoardSelectorController(controllerPages, 20_000);
    await selector.locator('button[aria-label*=" for "]:enabled').first().click();

    // Wait for answering phase
    await expect(page.getByText(/everyone is answering/i)).toBeVisible({ timeout: 20_000 });

    await submitTextAnswer(selector, "test-answer-sfx");

    // Skip through result
    await expect(page.getByText(/correct answer/i)).toBeVisible({ timeout: 20_000 });

    // Verify no audio errors occurred during the full phase cycle
    await expectNoAudioErrors(page);

    await closeAllControllers(controllers);
  });
});
