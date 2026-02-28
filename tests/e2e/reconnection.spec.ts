import { expect, test } from "@playwright/test";

test("controller reconnects after refresh", async ({ page, browser }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /create room/i }).click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/, { timeout: 60_000 });

  const match = page.url().match(/\/room\/([A-Z0-9]{4})$/);
  expect(match).not.toBeNull();
  const code = match?.[1] ?? "";

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const controllerPage = await context.newPage();
  await controllerPage.goto(`http://127.0.0.1:3001/?code=${code}`);

  await controllerPage.getByLabel("Your Name").fill("Alice");
  await controllerPage.getByRole("button", { name: /^join$/i }).click();
  await expect(controllerPage).toHaveURL(/\/play$/);
  await expect(controllerPage.getByText(/waiting for the host/i)).toBeVisible();

  await expect(page.getByText("Alice")).toBeVisible();

  await controllerPage.reload();

  // After reload, the room hook should reconnect using sessionStorage token.
  await expect(controllerPage).toHaveURL(/\/play$/);
  await expect(controllerPage.getByText(/waiting for the host/i)).toBeVisible();

  await expect(page.getByText("Alice")).toBeVisible();

  await context.close();
});
