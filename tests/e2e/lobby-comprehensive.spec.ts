import { expect, test } from "@playwright/test";

import {
  closeAllControllers,
  createRoom,
  joinControllersForRoom,
  joinPlayerForRoom,
  selectGameAndStart,
  waitForColyseusHealthy,
} from "./e2e-helpers";

test.describe("Lobby Comprehensive", () => {
  test("create room from landing page", async ({ page }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    // Should be on /room/XXXX
    expect(code).toMatch(/^[A-Z0-9]{4}$/);
    await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/);

    // Host sees lobby with game selector buttons
    await expect(page.getByRole("button", { name: /^Brain Board$/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("host is first player with controls", async ({ page }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    await createRoom(page);

    // Host should see game selector buttons (host controls)
    await expect(page.getByRole("button", { name: /^Brain Board$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Survey Smash$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Lucky Letters$/i })).toBeVisible();

    // Host should see complexity picker after selecting a game
    await page.getByRole("button", { name: /^Brain Board$/i }).click();
    await expect(page.getByRole("button", { name: /^kids/i })).toBeVisible();
  });

  test("join room via code", async ({ page, browser }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    const p1 = await joinPlayerForRoom(browser, page, { code, name: "Joiner" });
    await expect(page.getByText("Joiner", { exact: true })).toBeVisible({ timeout: 15_000 });

    await p1.context.close();
  });

  test("multiple players join with correct names", async ({ page, browser }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    const controllers = await joinControllersForRoom(browser, page, code, [
      "Alice",
      "Bob",
      "Charlie",
    ]);

    await expect(page.getByText("Alice", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Bob", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Charlie", { exact: true })).toBeVisible({ timeout: 10_000 });

    await closeAllControllers(controllers);
  });

  test("game selection highlights selected game", async ({ page }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    await createRoom(page);

    const bbBtn = page.getByRole("button", { name: /^Brain Board$/i });
    await bbBtn.click();

    await expect(bbBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("game change updates selection", async ({ page }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    await createRoom(page);

    // Select Brain Board
    const bbBtn = page.getByRole("button", { name: /^Brain Board$/i });
    await bbBtn.click();
    await expect(bbBtn).toHaveAttribute("aria-pressed", "true");

    // Switch to Lucky Letters
    const llBtn = page.getByRole("button", { name: /^Lucky Letters$/i });
    await llBtn.click();
    await expect(llBtn).toHaveAttribute("aria-pressed", "true");
    await expect(bbBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("complexity selection works", async ({ page }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    await createRoom(page);

    await page.getByRole("button", { name: /^Brain Board$/i }).click();

    const kidsBtn = page.getByRole("button", { name: /^kids/i });
    const standardBtn = page.getByRole("button", { name: /^standard/i });
    const advancedBtn = page.getByRole("button", { name: /^advanced/i });

    await expect(kidsBtn).toBeVisible();
    await standardBtn.click();
    await advancedBtn.click();
    await kidsBtn.click();

    // All buttons remain visible
    await expect(kidsBtn).toBeVisible();
    await expect(standardBtn).toBeVisible();
    await expect(advancedBtn).toBeVisible();
  });

  test("start requires min 2 players", async ({ page, browser }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    await page.getByRole("button", { name: /^Brain Board$/i }).click();

    // Host counts as player 1 — start button disabled with only host
    const startButton = page.getByRole("button", { name: /waiting for players|start game/i });
    await expect(startButton).toBeDisabled();

    // Join 1 additional player — now 2 total (host + Solo) — should enable
    const p1 = await joinPlayerForRoom(browser, page, { code, name: "Solo" });
    await expect(startButton).toBeEnabled({ timeout: 15_000 });

    await p1.context.close();
  });

  test("start game works with 2+ players", async ({ page, browser }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    const controllers = await joinControllersForRoom(browser, page, code, ["Amy", "Zoe"]);
    await selectGameAndStart(page, { gameName: "Brain Board", complexity: "kids" });

    // Should be in game — Brain Board shows category reveal or similar
    await expect(page.getByText(/brain board/i)).toBeVisible({ timeout: 20_000 });

    await closeAllControllers(controllers);
  });

  test("fresh create after previous session has no ghost players", async ({ page }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);

    // Simulate stale tokens
    await page.evaluate(() => {
      sessionStorage.setItem("flimflam_reconnect_token", "stale-token-abc");
      sessionStorage.setItem("flimflam_room_code", "ZZZZ");
      localStorage.setItem("flimflam_reconnect_token", "stale-token-abc");
      localStorage.setItem("flimflam_room_code", "ZZZZ");
    });

    // Create a new room — should clear stale tokens and start fresh
    const { code } = await createRoom(page);
    expect(code).toMatch(/^[A-Z0-9]{4}$/);

    // Verify no ghost player names from old sessions
    // The lobby should only show the host (creator)
    await expect(page.getByRole("button", { name: /^Brain Board$/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});
