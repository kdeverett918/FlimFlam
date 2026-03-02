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

export async function autoplayHotTakeController(
  controllerPage: Page,
  { isGameOver, topic }: { isGameOver: () => boolean; topic: string },
): Promise<number> {
  let submits = 0;
  const deadline = Date.now() + 60_000;

  while (!isGameOver() && Date.now() < deadline) {
    // Hot Take "player input" mode (topic-setup) can be enabled in some environments.
    // Handle it defensively even though most E2E runs use kids mode.
    const topicSetupHeading = controllerPage.getByRole("heading", {
      name: /pick a topic for hot take/i,
    });

    if (await topicSetupHeading.isVisible().catch(() => false)) {
      const categoryButton = controllerPage
        .getByRole("button")
        .filter({ hasText: /politics|dating|workplace|food|technology|lifestyle|wildcard/i })
        .first();
      await categoryButton.click().catch(() => {});

      const topicInput = controllerPage.getByPlaceholder(/type your topic/i);
      await topicInput.fill(topic).catch(() => {});

      const lockItIn = controllerPage.getByRole("button", { name: /lock it in/i });
      await lockItIn.click().catch(() => {});

      await controllerPage
        .getByText(/topic submitted/i)
        .waitFor({ state: "visible", timeout: 10_000 })
        .catch(() => {});

      continue;
    }

    const submit = controllerPage.getByRole("button", { name: /^submit$/i });
    if (await submit.isVisible().catch(() => false)) {
      await submit.click().catch(() => {});
      submits++;
      // Timer scaling can make the "Submitted!" state brief, so just wait for the button to go away.
      await submit.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
      continue;
    }

    await controllerPage.waitForTimeout(100);
  }

  return submits;
}
