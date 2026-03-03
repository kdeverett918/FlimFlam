import { type Browser, type Page, expect, test } from "@playwright/test";

import {
  createRoom,
  driveSurveySmashKidsToFinalScores,
  joinControllersForRoom,
  selectGameAndStart,
  waitForColyseusHealthy,
} from "./e2e-helpers";

async function reachSurveySmashFinalScores(page: Page, browser: Browser) {
  await page.goto("/");
  await waitForColyseusHealthy(page);

  const { code } = await createRoom(page);
  const joined = await joinControllersForRoom(browser, page, code, ["Ari", "Bea", "Cam"]);
  const controllerPages = joined.map((c) => c.controllerPage);

  await selectGameAndStart(page, { gameName: "Survey Smash", complexity: "kids" });
  await driveSurveySmashKidsToFinalScores(page, controllerPages);

  return joined;
}

test.describe("Final Scores Actions", () => {
  test("Play Again restarts the current game from final scores", async ({ page, browser }) => {
    const joined = await reachSurveySmashFinalScores(page, browser);

    await expect(page.getByRole("button", { name: /play again/i })).toBeVisible();
    await page.getByRole("button", { name: /play again/i }).click();

    await expect(page.getByRole("heading", { name: /final scores/i })).toHaveCount(0, {
      timeout: 20_000,
    });
    await expect(page.getByText(/new question|face off|survey smash/i)).toBeVisible({
      timeout: 20_000,
    });

    for (const controller of joined) {
      await controller.context.close();
    }
  });

  test("New Game returns host and controllers to lobby", async ({ page, browser }) => {
    const joined = await reachSurveySmashFinalScores(page, browser);

    await expect(page.getByRole("button", { name: /new game/i })).toBeVisible();
    await page.getByRole("button", { name: /new game/i }).click();

    await expect(page.getByRole("heading", { name: /^players$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: /^select game$/i })).toBeVisible();

    for (const controller of joined) {
      await expect(
        controller.controllerPage.getByRole("heading", { name: /you're in!/i }),
      ).toBeVisible({
        timeout: 20_000,
      });
      await controller.context.close();
    }
  });
});
