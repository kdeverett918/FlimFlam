import { type Page, expect, test } from "@playwright/test";

import {
  closeAllControllers,
  startGame,
} from "./e2e-helpers";

// ── Known kids category names from the static clue bank ──────────────────
// If ALL 6 displayed categories match this set, AI board gen failed silently.
const STATIC_KIDS_CATEGORIES = new Set([
  "Disney & Pixar",
  "YouTube & TikTok",
  "Video Games",
  "Superheroes",
  "Kids TV Shows",
  "Viral Moments",
  "Popular Songs",
  "Roblox & Minecraft",
  "Sports Stars",
  "Movie Quotes",
  "Social Media",
  "Memes & Internet",
  "Animated Movies",
  "Gaming Legends",
  "Taylor Swift",
  "Space & Science",
  "Food Trends",
  "Dance Challenges",
  "Marvel Universe",
  "Pet Influencers",
  "Streaming Shows",
  "Olympic Sports",
  "Board Games & Cards",
  "Funny Animals",
  "Emoji & Texting",
  "Holidays & Events",
  "Famous Duos",
  "Theme Parks",
  "Cool Inventions",
  "World Records",
  "Pokémon",
  "Famous YouTubers",
  "Music Artists",
  "Weird & Wacky",
  "Anime & Manga",
  "Toys & Trends",
  "Harry Potter",
  "Star Wars",
  "Internet Safety",
  "Geography Fun",
  "Challenges & Pranks",
  "Nature & Weather",
  "Science & Nature",
  "Music Fun",
  "Art & Colors",
  "Geography Adventures",
  "Books & Stories",
  "Bugs & Creepy Crawlies",
  "Space Explorers",
  "Mythology & Legends",
  "Technology for Kids",
  "Ocean Creatures",
  "World Holidays",
  "Dinosaurs",
  "Amazing Animals",
  "Math is Fun",
  "Countries & Flags",
  "Silly Science",
  "Classic Cartoons",
  "Sports Basics",
  "Weather Wonders",
  "Musical Instruments",
  "Inventions That Changed the World",
  "Human Body",
  "Famous Landmarks",
  "Pets & Pet Care",
]);

test.describe("Brain Board AI Smoke Test", () => {
  test.skip(!process.env.ANTHROPIC_API_KEY, "Skipped: no API key");

  test("topic chat feeds AI board generation and produces custom categories", async ({
    page,
    browser,
  }) => {
    // AI board generation can take 30-60s
    test.setTimeout(180_000);

    const { controllers } = await startGame(page, browser, {
      game: "Brain Board",
      complexity: "kids",
      playerNames: ["Astro", "Nova"],
    });
    const controllerPages = controllers.map((c) => c.controllerPage);

    // ── 1. Verify topic-chat phase loads on controller ────────────────────
    const firstController = controllerPages[0] as Page;
    await expect(firstController.getByText("Topic Lab")).toBeVisible({ timeout: 30_000 });

    // ── 2. Send chat messages from both players ──────────────────────────
    for (const [idx, topic] of ["dinosaurs and outer space", "underwater volcanoes"].entries()) {
      const cp = controllerPages[idx] as Page;
      const input = cp.locator('input[placeholder="Suggest a topic..."]');
      await expect(input).toBeVisible({ timeout: 15_000 });
      await input.fill(topic);
      await cp.locator('button[aria-label="Send message"]').click();
      await cp.waitForTimeout(500);
    }

    // ── 3. Skip topic-chat to trigger board generation ───────────────────
    const skipBtn = page.getByRole("button", { name: /^skip$/i });
    await page.waitForTimeout(1_000);
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click();
    }

    // ── 4. Wait for category-reveal (BRAIN BOARD!) ───────────────────────
    // This may pass through generating-board first (30-60s AI call).
    // Wait directly for "BRAIN BOARD" which only appears on category-reveal.
    await expect(page.getByText(/^BRAIN BOARD!?$/i).first()).toBeVisible({ timeout: 120_000 });

    // ── 5. Verify categories are AI-generated ────────────────────────────
    await page.waitForTimeout(1_500);

    const revealArea = page.locator(".flex.flex-wrap.justify-center.gap-4");
    const categoryPanels = revealArea.locator("> *");
    const panelCount = await categoryPanels.count().catch(() => 0);

    const displayedCategories: string[] = [];
    for (let i = 0; i < panelCount; i++) {
      const text = (await categoryPanels.nth(i).textContent())?.trim();
      if (text) displayedCategories.push(text);
    }

    console.log(`[AI Smoke] Category count: ${displayedCategories.length}`);
    console.log(`[AI Smoke] Categories: ${displayedCategories.join(" | ")}`);

    expect(panelCount, "Expected category panels on category-reveal screen").toBeGreaterThan(0);

    const allStatic = displayedCategories.every((cat) => STATIC_KIDS_CATEGORIES.has(cat));
    expect(
      allStatic,
      `All categories matched static bank — AI board gen likely failed. Categories: ${displayedCategories.join(", ")}`,
    ).toBe(false);

    // ── 6. Verify board grid loads (clue-select phase) ───────────────────
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click();
    }
    await expect(page.getByText("$200").first()).toBeVisible({ timeout: 15_000 });

    await closeAllControllers(controllers);
  });
});
