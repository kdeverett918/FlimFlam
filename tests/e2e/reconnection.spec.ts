import { expect, test } from "@playwright/test";

const CONTROLLER_URL = process.env.PARTYLINE_E2E_CONTROLLER_URL ?? "http://127.0.0.1:3301";
const COLYSEUS_HEALTH_URL =
  process.env.PARTYLINE_E2E_COLYSEUS_HEALTH_URL ?? "http://127.0.0.1:2567/health";

test("controller reconnects after refresh", async ({ page, browser }) => {
  await page.goto("/");

  // Ensure the Colyseus server is ready before attempting to create a room.
  await expect
    .poll(
      async () => {
        try {
          const res = await page.request.get(COLYSEUS_HEALTH_URL);
          return res.status();
        } catch {
          return 0;
        }
      },
      { timeout: 60_000 },
    )
    .toBe(200);

  await page.getByRole("button", { name: /create room/i }).click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/, { timeout: 60_000 });

  const match = page.url().match(/\/room\/([A-Z0-9]{4})$/);
  expect(match).not.toBeNull();
  const code = match?.[1] ?? "";

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const controllerPage = await context.newPage();
  await controllerPage.goto(`${CONTROLLER_URL}/?code=${code}`);

  await controllerPage.getByLabel("Your Name").fill("Alice");
  await controllerPage.getByRole("button", { name: /^join$/i }).click();
  await expect(controllerPage).toHaveURL(/\/play$/);
  await expect(controllerPage.getByText(/^connecting\.\.\.$/i)).toHaveCount(0, {
    timeout: 60_000,
  });
  await expect(controllerPage).toHaveURL(/\/play$/);

  await expect(page.getByText("Alice")).toBeVisible();

  await controllerPage.reload();

  // After reload, the room hook should reconnect using sessionStorage token.
  await expect(controllerPage).toHaveURL(/\/play$/);
  await expect(controllerPage.getByText(/^connecting\.\.\.$/i)).toHaveCount(0, {
    timeout: 60_000,
  });
  await expect(controllerPage).toHaveURL(/\/play$/);
  await expect(page.getByText("Alice")).toBeVisible({ timeout: 30_000 });

  await context.close();
});
