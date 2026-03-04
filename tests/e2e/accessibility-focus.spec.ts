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

    // Fill in the code and name fields first so the Join button is enabled.
    const code = "ABCD";
    for (let i = 0; i < code.length; i++) {
      const input = controllerPage.getByLabel(`Room code character ${i + 1}`);
      await input.fill(code[i] ?? "");
      await expect(input).toHaveValue(code[i] ?? "");
    }
    await controllerPage.getByLabel("Your Name").fill("Test");

    // Find the Join button and focus it explicitly via keyboard
    const joinButton = controllerPage.getByRole("button", { name: /^join$/i });
    await expect(joinButton).toBeEnabled();

    const firstCodeInput = controllerPage.getByLabel("Room code character 1");
    await firstCodeInput.focus();
    for (let i = 0; i < 20; i++) {
      const isFocused = await joinButton.evaluate((el) => el === document.activeElement);
      if (isFocused) {
        break;
      }
      await controllerPage.keyboard.press("Tab");
    }

    await expect
      .poll(async () => joinButton.evaluate((el) => el === document.activeElement), {
        timeout: 5_000,
      })
      .toBe(true);

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
