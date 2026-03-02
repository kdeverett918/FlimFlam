import { type Browser, type BrowserContext, type Page, expect } from "@playwright/test";

export const CONTROLLER_URL = process.env.FLIMFLAM_E2E_CONTROLLER_URL ?? "http://127.0.0.1:3301";
export const COLYSEUS_HEALTH_URL =
  process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? "http://127.0.0.1:2567/health";

export const DEFAULT_MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

export type JoinedController = { context: BrowserContext; controllerPage: Page };

export async function waitForColyseusHealthy(page: Page, url = COLYSEUS_HEALTH_URL): Promise<void> {
  await expect
    .poll(
      async () => {
        try {
          const res = await page.request.get(url);
          return res.status();
        } catch {
          return 0;
        }
      },
      { timeout: 60_000 },
    )
    .toBe(200);
}

export async function createRoom(page: Page): Promise<{ code: string }> {
  // The homepage has two "CREATE ROOM" CTAs with the same aria-label.
  // Use the accessible name (not the visible text) and click the first CTA.
  const createRoomButton = page.getByRole("button", { name: /create a new game room/i }).first();
  await expect(createRoomButton).toBeVisible({ timeout: 30_000 });
  await expect(createRoomButton).toBeEnabled();
  await createRoomButton.click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/, { timeout: 60_000 });

  const match = page.url().match(/\/room\/([A-Z0-9]{4})$/);
  if (!match) {
    throw new Error(`[e2e] expected room code in URL, got: ${page.url()}`);
  }

  return { code: match[1] ?? "" };
}

export async function joinControllerForRoom(
  browser: Browser,
  hostPage: Page,
  {
    code,
    name,
    controllerUrl = CONTROLLER_URL,
  }: { code: string; name: string; controllerUrl?: string },
): Promise<JoinedController> {
  const context = await browser.newContext({ viewport: DEFAULT_MOBILE_VIEWPORT });
  const controllerPage = await context.newPage();
  await controllerPage.goto(`${controllerUrl}/?code=${code}`);
  await controllerPage.getByLabel("Your Name").fill(name);
  await controllerPage.getByRole("button", { name: /^join$/i }).click();
  await expect(controllerPage).toHaveURL(/\/play$/);

  // Ensure we actually landed in a connected /play state (not a transient redirect).
  await expect(controllerPage.getByText(/^connecting\.\.\.$/i)).toHaveCount(0, { timeout: 60_000 });
  await expect(controllerPage).toHaveURL(/\/play$/);

  // Avoid strict-mode collisions like "Eve" matching "everyone" in card copy.
  await expect(hostPage.getByText(name, { exact: true })).toBeVisible({ timeout: 30_000 });
  return { context, controllerPage };
}
