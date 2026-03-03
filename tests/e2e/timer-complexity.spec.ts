import { expect, test } from "@playwright/test";

import {
  closeAllControllers,
  driveBrainBoardToPhase,
  driveSurveySmashToPhase,
  startGame,
} from "./e2e-helpers";

/**
 * Timer Complexity Scaling — verify that kids gives more time than advanced.
 *
 * With FLIMFLAM_TIMER_SCALE=0.12 (E2E default):
 *   Kids bb-answer:     20_000 * 1.5  * 0.12 ≈ 3600ms → ~4s
 *   Advanced bb-answer: 20_000 * 0.75 * 0.12 ≈ 1800ms → ~2s
 */

function getTimerSeconds(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const timerSvg = document.querySelector("svg[viewBox] > title");
    if (!timerSvg?.textContent?.includes("Timer countdown")) return null;
    const parent = timerSvg.closest("div");
    const span = parent?.querySelector("span");
    if (!span) return null;
    return Number.parseInt(span.textContent ?? "0", 10);
  });
}

test.describe("Timer Complexity Scaling", () => {
  test("Brain Board kids timer is longer than advanced", async ({ page, browser }) => {
    // ── Kids game ──
    const kids = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Kia", "Kai"],
    });
    const kidsControllers = kids.controllers.map((c) => c.controllerPage);

    // Drive to answering phase (timer starts here)
    await driveBrainBoardToPhase(page, kidsControllers, /everyone is answering/i);

    // Read timer seconds as soon as phase appears
    const kidsSeconds = await getTimerSeconds(page);

    await closeAllControllers(kids.controllers);

    // ── Advanced game (new room) ──
    const adv = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "advanced",
      playerNames: ["Ada", "Abe"],
    });
    const advControllers = adv.controllers.map((c) => c.controllerPage);

    await driveBrainBoardToPhase(page, advControllers, /everyone is answering/i);

    const advSeconds = await getTimerSeconds(page);

    await closeAllControllers(adv.controllers);

    // Kids timer should be strictly longer than advanced
    expect(kidsSeconds).toBeGreaterThan(0);
    expect(advSeconds).toBeGreaterThan(0);
    expect(kidsSeconds as number).toBeGreaterThan(advSeconds as number);
  });

  test("Survey Smash kids face-off timer is longer than advanced", async ({ page, browser }) => {
    // ── Kids game ──
    const kids = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Kia", "Kai", "Kit"],
    });
    const kidsControllers = kids.controllers.map((c) => c.controllerPage);

    // Drive to face-off phase (shows VS)
    await driveSurveySmashToPhase(page, kidsControllers, "VS");
    const kidsSeconds = await getTimerSeconds(page);

    await closeAllControllers(kids.controllers);

    // ── Advanced game ──
    const adv = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "advanced",
      playerNames: ["Ada", "Abe", "Ava"],
    });
    const advControllers = adv.controllers.map((c) => c.controllerPage);

    await driveSurveySmashToPhase(page, advControllers, "VS");
    const advSeconds = await getTimerSeconds(page);

    await closeAllControllers(adv.controllers);

    expect(kidsSeconds).toBeGreaterThan(0);
    expect(advSeconds).toBeGreaterThan(0);
    expect(kidsSeconds as number).toBeGreaterThan(advSeconds as number);
  });
});
