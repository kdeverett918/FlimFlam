import { expect, test } from "@playwright/test";

import {
  closeAllControllers,
  createRoom,
  joinControllersForRoom,
  selectGameAndStart,
  waitForColyseusHealthy,
} from "./e2e-helpers";

test.describe("Controller Reconnect Retry Loop", () => {
  test("controller reconnects after going offline briefly", async ({ page, browser }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);

    const { code } = await createRoom(page);
    const controllers = await joinControllersForRoom(browser, page, code, ["Nora", "Nick"]);

    await selectGameAndStart(page, { gameName: "Brain Board", complexity: "kids" });
    await expect(page.getByRole("button", { name: /^skip$/i })).toBeVisible({ timeout: 30_000 });

    // Simulate offline → online for the first controller
    const controllerPage = controllers[0].controllerPage;

    // Set the context offline
    await controllers[0].context.setOffline(true);

    // Wait a moment to ensure the connection drops
    await controllerPage.waitForTimeout(1500);

    // Come back online
    await controllers[0].context.setOffline(false);

    // The controller should reconnect — verify it's still functional
    // by checking that the controller page doesn't show a fatal error
    // and the player still appears on the host
    await expect(page.getByText("Nora", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Nick", { exact: true })).toBeVisible({ timeout: 30_000 });

    // Verify the controller page is responsive (not stuck on error)
    await expect(controllerPage.getByText(/connection lost|fatal error/i)).toHaveCount(0, {
      timeout: 15_000,
    });

    await closeAllControllers(controllers);
  });

  test("player persists on host after controller page refresh", async ({ page, browser }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);

    const { code } = await createRoom(page);
    const controllers = await joinControllersForRoom(browser, page, code, ["Remi", "Roni"]);

    // Remi is visible on host
    await expect(page.getByText("Remi", { exact: true })).toBeVisible({ timeout: 20_000 });

    // Refresh Remi's controller (triggers reconnect via stored token)
    await controllers[0].controllerPage.reload();

    // Remi should still be visible on host after reconnection
    await expect(page.getByText("Remi", { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Roni", { exact: true })).toBeVisible({ timeout: 20_000 });

    await closeAllControllers(controllers);
  });
});
