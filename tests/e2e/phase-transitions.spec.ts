import { expect, test } from "@playwright/test";

import {
  createRoom,
  joinControllersForRoom,
  selectGameAndStart,
  waitForColyseusHealthy,
} from "./e2e-helpers";

const PHASE_TRANSITION_CASES = [
  { gameName: "Brain Board", expectedLabel: "Here Are the Categories!" },
  { gameName: "Lucky Letters", expectedLabel: "New Round!" },
  { gameName: "Survey Smash", expectedLabel: "New Question!" },
] as const;

test.describe("Phase Transition Overlay", () => {
  for (const tc of PHASE_TRANSITION_CASES) {
    test(`${tc.gameName} shows transition overlay when gameplay starts`, async ({
      page,
      browser,
    }) => {
      await page.goto("/");
      await waitForColyseusHealthy(page);

      const { code } = await createRoom(page);
      const joined = await joinControllersForRoom(browser, page, code, ["P1", "P2"]);

      await selectGameAndStart(page, { gameName: tc.gameName, complexity: "kids" });
      await expect(
        page.getByRole("heading", { name: new RegExp(tc.expectedLabel, "i") }),
      ).toBeVisible({
        timeout: 15_000,
      });

      // Overlay also includes the round counter.
      await expect(page.getByText(/round 1\/\d/i)).toBeVisible({ timeout: 15_000 });

      for (const controller of joined) {
        await controller.context.close();
      }
    });
  }
});
