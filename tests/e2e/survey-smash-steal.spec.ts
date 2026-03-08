import { type Locator, type Page, expect, test } from "@playwright/test";

import { closeAllControllers, driveSurveySmashToStealChance, startGame } from "./e2e-helpers";

async function anyVisible(locator: Locator): Promise<boolean> {
  const count = await locator.count().catch(() => 0);
  for (let index = count - 1; index >= 0; index -= 1) {
    if (
      await locator
        .nth(index)
        .isVisible()
        .catch(() => false)
    ) {
      return true;
    }
  }
  return false;
}

async function latestHostPhase(page: Page): Promise<string | null> {
  const hostState = page.locator('[data-testid="survey-smash-host-state"]');
  const count = await hostState.count().catch(() => 0);
  const target = count > 0 ? hostState.nth(count - 1) : hostState.first();
  return await target.getAttribute("data-phase").catch(() => null);
}

test.describe("Survey Smash — Steal Mechanics", () => {
  test.describe.configure({ timeout: 180_000 });

  test("steal-chance clears stale inputs for non-active players", async ({ page, browser }) => {
    const { controllers } = await startGame(page, browser, {
      game: "Survey Smash",
      complexity: "kids",
      playerNames: ["Ari", "Bea", "Cam", "Dan"],
    });

    try {
      const controllerPages = controllers.map((controller) => controller.controllerPage);
      const actorPages = [page, ...controllerPages];
      await driveSurveySmashToStealChance(page, controllerPages, 90_000, {
        allowPastStealWindow: true,
      });

      await expect
        .poll(
          async () => {
            let stealInputCount = 0;
            let guesserInputCount = 0;
            let guessAlongInputCount = 0;
            const debug: string[] = [];
            const hostPhase = await latestHostPhase(page);

            for (const [index, actorPage] of actorPages.entries()) {
              const stealInput = actorPage.locator('[data-testid="survey-smash-steal-input"]');
              const stealVisible = await anyVisible(stealInput);
              if (stealVisible) {
                stealInputCount += 1;
              }

              const staleGuesserVisible = await anyVisible(
                actorPage.locator('[data-testid="survey-smash-guesser-input"]'),
              );
              const staleGuessAlongVisible = await anyVisible(
                actorPage.locator('[data-testid="survey-smash-guess-along-input"]'),
              );

              if (staleGuesserVisible) {
                guesserInputCount += 1;
              }
              if (staleGuessAlongVisible) {
                guessAlongInputCount += 1;
              }

              const inputsLookUnexpected =
                hostPhase === "steal-chance"
                  ? staleGuesserVisible || staleGuessAlongVisible
                  : hostPhase === "guessing"
                    ? stealVisible
                    : staleGuesserVisible || staleGuessAlongVisible || stealVisible;

              if (inputsLookUnexpected) {
                debug.push(
                  `page${index}:stealVisible=${stealVisible} guesserVisible=${staleGuesserVisible} guessAlongVisible=${staleGuessAlongVisible}`,
                );
              }
            }

            const hostMovedPastGuessing =
              hostPhase !== null &&
              hostPhase !== "face-off" &&
              hostPhase !== "guessing" &&
              hostPhase !== "strike";
            const cleanStealState =
              hostPhase === "steal-chance" &&
              stealInputCount >= 1 &&
              guesserInputCount === 0 &&
              guessAlongInputCount === 0;
            const cleanFreshGuessingState =
              hostPhase === "guessing" && stealInputCount === 0 && guesserInputCount === 1;
            const cleanFreshFaceOffState =
              hostPhase === "face-off" && stealInputCount === 0 && guesserInputCount === 0;

            return debug.length === 0 &&
              (cleanStealState ||
                cleanFreshGuessingState ||
                cleanFreshFaceOffState ||
                hostMovedPastGuessing)
              ? "ready"
              : `waiting: phase=${hostPhase} stealInputs=${stealInputCount}; ${debug.join(" | ")}`;
          },
          { timeout: 10_000 },
        )
        .toBe("ready");
    } finally {
      await closeAllControllers(controllers);
    }
  });
});
