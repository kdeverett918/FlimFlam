import { expect, test } from "@playwright/test";

import {
  createRoom,
  driveSurveySmashKidsToFinalScores,
  joinControllersForRoom,
  selectGameAndStart,
  waitForColyseusHealthy,
} from "./e2e-helpers";

test.describe("Survey Smash Flow", () => {
  test("completes kids-mode game to final scores with deterministic host controls", async ({
    page,
    browser,
  }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);

    const { code } = await createRoom(page);
    const joined = await joinControllersForRoom(browser, page, code, ["Mia", "Noah", "Ava"]);
    const controllerPages = joined.map((c) => c.controllerPage);

    await selectGameAndStart(page, { gameName: "Survey Smash", complexity: "kids" });
    await driveSurveySmashKidsToFinalScores(page, controllerPages);

    await expect(page.getByText("Mia", { exact: true })).toBeVisible();
    await expect(page.getByText("Noah", { exact: true })).toBeVisible();
    await expect(page.getByText("Ava", { exact: true })).toBeVisible();

    for (const controller of joined) {
      await controller.context.close();
    }
  });
});
