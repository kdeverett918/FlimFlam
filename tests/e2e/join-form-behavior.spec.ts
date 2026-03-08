import { type Locator, type Page, expect, test } from "@playwright/test";

function getCodeInputs(page: Page): Locator[] {
  return Array.from({ length: 4 }, (_, index) =>
    page.getByLabel(`Room code character ${index + 1}`).first(),
  );
}

test.describe("Join Form Behavior", () => {
  test("sanitizes pasted room codes and only enables join when name is present", async ({
    page,
  }) => {
    await page.goto("/");

    const codeInputs = getCodeInputs(page);
    const joinButton = page.getByTestId("join-form-submit");
    const joinNameInput = page.locator("#action-player-name");

    await expect(joinButton).toBeDisabled();

    await codeInputs[0].evaluate((element, text) => {
      const data = new DataTransfer();
      data.setData("text", text);
      element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, clipboardData: data }));
    }, "a!b2z");

    await expect(codeInputs[0]).toHaveValue("A");
    await expect(codeInputs[1]).toHaveValue("B");
    await expect(codeInputs[2]).toHaveValue("2");
    await expect(codeInputs[3]).toHaveValue("Z");
    await expect(joinButton).toBeDisabled();

    await joinNameInput.fill("Casey");
    await expect(joinButton).toBeEnabled();
  });

  test("backspace on an empty slot rewinds focus and clears the previous character", async ({
    page,
  }) => {
    await page.goto("/");

    const codeInputs = getCodeInputs(page);
    const [firstInput, secondInput, thirdInput] = codeInputs;

    await firstInput.fill("A");
    await secondInput.fill("B");
    await expect(thirdInput).toBeFocused();

    await thirdInput.press("Backspace");

    await expect(secondInput).toBeFocused();
    await expect(firstInput).toHaveValue("A");
    await expect(secondInput).toHaveValue("");
    await expect(thirdInput).toHaveValue("");
  });
});
