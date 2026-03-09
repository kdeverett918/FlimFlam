import { expect, test } from "@playwright/test";

test.describe("FlimFlap Route", () => {
  test("redirects the legacy trumpybird path to flimflap", async ({ page }) => {
    await page.goto("/trumpybird");
    await expect(page).toHaveURL(/\/flimflap$/i);
  });

  test("preserves nested legacy paths and query params", async ({ page }) => {
    await page.goto("/trumpybird/special?mode=daily&seed=abc123");
    await expect(page).toHaveURL(/\/flimflap\/special\?mode=daily&seed=abc123$/i);
  });

  test("serves the mounted FlimFlap client bundle from the new route", async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto("/flimflap");

    await expect(page).toHaveTitle(/FlimFlap \| FLIMFLAM/i);
    await expect(page.locator("#root")).toBeVisible();
    await expect(page.locator('script#flimflap-client-entry[src^="/flimflap/assets/"]')).toHaveCount(
      1,
    );
    await expect(page.getByRole("link", { name: /single player/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /login/i })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __FLIMFLAP_BACKEND_URL__?: string }).__FLIMFLAP_BACKEND_URL__ ??
            null,
        ),
      )
      .not.toBeNull();

    const viewportHeight = page.viewportSize()?.height ?? 900;
    const singlePlayerBox = await page.getByRole("link", { name: /single player/i }).boundingBox();
    const loginBox = await page.getByRole("button", { name: /login/i }).boundingBox();
    expect(singlePlayerBox).not.toBeNull();
    expect(loginBox).not.toBeNull();
    expect(singlePlayerBox!.y + singlePlayerBox!.height).toBeLessThan(viewportHeight);
    expect(loginBox!.y + loginBox!.height).toBeLessThan(viewportHeight);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("opens the landing support surfaces without runtime errors", async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto("/flimflap");

    await page.getByRole("button", { name: /player/i }).click();
    await expect(page.getByRole("textbox", { name: /name/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /done/i })).toBeVisible();
    await page.getByRole("button", { name: /done/i }).click();

    await page.getByRole("button", { name: /join room/i }).click();
    await expect(page.getByRole("textbox", { name: /join code/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /spectate code/i })).toBeVisible();
    await page.getByRole("button", { name: /close/i }).click();

    await page.getByRole("button", { name: /^login$/i }).click();
    await expect(page.getByRole("region", { name: /account/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
    await page.getByRole("button", { name: /close/i }).click();

    await page.getByRole("button", { name: /how to play/i }).click();
    await expect(page.getByText(/tap or press space to flap/i)).toBeVisible();
    await expect(page.getByText(/avoid pipes/i)).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("loads the leaderboard route without cross-origin or runtime failures", async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto("/flimflap");
    await expect(page.getByRole("link", { name: /^leaderboard$/i })).toBeVisible();
    await page.getByRole("link", { name: /^leaderboard$/i }).click();

    await expect(page).toHaveURL(/\/flimflap\/leaderboard$/i);
    await expect(page.getByRole("heading", { name: /leaderboard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /back/i })).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
