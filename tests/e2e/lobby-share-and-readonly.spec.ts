import { expect, test } from "@playwright/test";

import {
  closeAllControllers,
  createRoom,
  joinControllersForRoom,
  waitForColyseusHealthy,
} from "./e2e-helpers";

test.describe("Lobby Share And Read-Only Contracts", () => {
  test("share panel copies room code and falls back to copying the join link", async ({ page }) => {
    await page.addInitScript(() => {
      const win = window as typeof window & { __copiedTexts?: string[] };
      win.__copiedTexts = [];

      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            win.__copiedTexts?.push(text);
          },
        },
      });

      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: undefined,
      });
    });

    await page.goto("/");
    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    const copiedTexts = async () =>
      page.evaluate(
        () => (window as typeof window & { __copiedTexts?: string[] }).__copiedTexts ?? [],
      );

    await page.getByTestId("share-room-code").click();
    await expect
      .poll(async () => (await copiedTexts()).includes(code), { timeout: 10_000 })
      .toBe(true);
    await expect(page.getByText(/^Copied!$/i)).toBeVisible();

    await page.getByTestId("share-room-link").click();
    await expect
      .poll(async () => (await copiedTexts()).some((text) => text.endsWith(`/room/${code}`)), {
        timeout: 10_000,
      })
      .toBe(true);

    await expect(page.locator('img[alt="QR code to join the game"]')).toBeVisible();
    await expect(page.getByTestId("share-room-url")).toContainText(`/room/${code}`);
  });

  test("controllers stay read-only while ready state reflects on the host", async ({
    page,
    browser,
  }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    const controllers = await joinControllersForRoom(browser, page, code, ["Solo", "Duo"]);
    const [controller] = controllers;
    const controllerPage = controller.controllerPage;

    const hostAction = page.getByTestId("lobby-primary-action");
    await expect(hostAction).toHaveText(/select a game/i, { timeout: 15_000 });
    await expect(hostAction).toBeDisabled();

    await page.getByRole("button", { name: /^survey smash$/i }).click();
    await expect(hostAction).toHaveText(/start game/i);
    await expect(hostAction).toBeEnabled({ timeout: 15_000 });

    const controllerAction = controllerPage.getByTestId("lobby-primary-action");
    const selectedGame = controllerPage.getByTestId("game-option-survey-smash");

    await expect(controllerAction).toHaveText(/ready up/i, { timeout: 15_000 });
    await expect(selectedGame).toHaveAttribute("aria-pressed", "true");
    await expect(selectedGame).toBeDisabled();
    await expect(controllerPage.getByRole("button", { name: /^start game$/i })).toHaveCount(0);

    await controllerAction.click();
    await expect(controllerAction).toHaveText(/ready!/i);
    await expect(page.locator('[aria-label="Solo ready"]')).toBeVisible({ timeout: 15_000 });

    await closeAllControllers(controllers);
  });
});
