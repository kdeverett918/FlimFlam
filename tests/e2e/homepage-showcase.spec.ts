import { expect, test } from "@playwright/test";

import { waitForColyseusHealthy } from "./e2e-helpers";

const GAME_NAMES = ["Brain Board", "Lucky Letters", "Survey Smash"];

test.describe("Homepage Showcase", () => {
  test("shows current game catalog cards with metadata", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /^the games$/i })).toBeVisible();

    for (const gameName of GAME_NAMES) {
      await expect(
        page.getByRole("heading", { name: new RegExp(`^${gameName}$`, "i") }),
      ).toBeVisible();
    }

    const cardPlayerRanges = page.getByText("2-8");
    await expect(cardPlayerRanges).toHaveCount(3);
    await expect(page.getByText(/Click to preview/i).first()).toBeVisible();
  });

  test("preview dialog opens for each game and supports play CTA", async ({ page }) => {
    await page.goto("/");

    for (const gameName of GAME_NAMES) {
      await page.getByRole("button", { name: new RegExp(`^${gameName}$`, "i") }).click();
      await expect(
        page.getByRole("heading", { name: new RegExp(`^${gameName}$`, "i") }),
      ).toBeVisible();
      await expect(page.getByText(/How to Play/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /play this game/i })).toBeVisible();
      await page.getByRole("button", { name: /close/i }).click();
      await expect(page.getByRole("button", { name: /play this game/i })).toHaveCount(0);
    }
  });

  test("play this game CTA preselects game in lobby", async ({ page }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);

    await page.getByRole("button", { name: /^Survey Smash$/i }).click();
    await page.getByRole("button", { name: /play this game/i }).click();
    await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/i, { timeout: 60_000 });

    const selectedSurveyCard = page.getByRole("button", { name: /^Survey Smash$/i });
    await expect(selectedSurveyCard).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /^start game$/i })).toBeVisible();
  });
});
