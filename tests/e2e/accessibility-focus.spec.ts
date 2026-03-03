import { expect, test } from "@playwright/test";

import { CONTROLLER_URL, DEFAULT_MOBILE_VIEWPORT, waitForColyseusHealthy } from "./e2e-helpers";

test.describe("Accessibility Focus-Visible Styles", () => {
  test("Join button shows focus-visible ring on keyboard focus", async ({ page, browser }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);

    // Open controller in a new context
    const context = await browser.newContext({ viewport: DEFAULT_MOBILE_VIEWPORT });
    const controllerPage = await context.newPage();
    await controllerPage.goto(CONTROLLER_URL);

    // Fill in the code and name fields first so the Join button is enabled
    await controllerPage.getByLabel("Room Code").fill("ABCD");
    await controllerPage.getByLabel("Your Name").fill("Test");

    // Tab to the Join button using keyboard
    await controllerPage.keyboard.press("Tab");
    await controllerPage.keyboard.press("Tab");
    await controllerPage.keyboard.press("Tab");

    // Find the Join button and focus it explicitly via keyboard
    const joinButton = controllerPage.getByRole("button", { name: /^join$/i });
    await joinButton.focus();

    // Verify the focus-visible box-shadow is applied (not "none")
    const boxShadow = await joinButton.evaluate((el) => {
      return window.getComputedStyle(el).boxShadow;
    });

    // Should have a non-"none" box-shadow when focused
    expect(boxShadow).not.toBe("none");
    expect(boxShadow).not.toBe("");

    await context.close();
  });
});
