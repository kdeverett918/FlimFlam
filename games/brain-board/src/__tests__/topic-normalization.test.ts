import { describe, expect, it } from "vitest";

import {
  extractTopicSuggestions,
  normalizeTopicSuggestion,
  validateGeneratedCategoryAnchors,
} from "../index";

describe("Brain Board topic normalization", () => {
  it("normalizes whitespace and removes common lead-in phrases", () => {
    expect(normalizeTopicSuggestion("  I love   Movies  ")).toBe("Movies");
    expect(normalizeTopicSuggestion("How about   science ")).toBe("science");
    expect(normalizeTopicSuggestion('"Marvel Rivals"')).toBe("Marvel Rivals");
    expect(normalizeTopicSuggestion("thanks")).toBeNull();
  });

  it("splits on punctuation and dedupes case-insensitively", () => {
    const suggestions = extractTopicSuggestions([
      "I love Movies, science and HISTORY!!",
      "movies",
      "  science  ",
    ]);

    expect(suggestions).toEqual(["Movies", "science", "HISTORY"]);
  });

  it("rejects category names that broaden a specific submitted title", () => {
    const validation = validateGeneratedCategoryAnchors(
      [
        "Rivals Roster",
        "Hero Roles",
        "Marvel Universe Origins",
        "Super Power Science",
        "Comic Book Geography",
        "Villainous Schemes",
      ],
      ["Marvel Rivals"],
    );

    expect(validation.valid).toBe(false);
    expect(validation.reason).toMatch(/submitted topics/i);
  });

  it("accepts category names that stay visibly tied to a specific submitted title", () => {
    const validation = validateGeneratedCategoryAnchors(
      [
        "Marvel Rivals Heroes",
        "Marvel Rivals Maps",
        "Marvel Rivals Team-Ups",
        "Marvel Rivals Launch Era",
        "Marvel Rivals Ranked Play",
        "Marvel Rivals Voice Lines",
      ],
      ["Marvel Rivals"],
    );

    expect(validation.valid).toBe(true);
    expect(validation.reason).toBeNull();
  });

  it("allows broad topics to match close singular or plural category names", () => {
    const validation = validateGeneratedCategoryAnchors(
      [
        "Movie Quotes",
        "Music Icons",
        "Sports Legends",
        "Science Lab",
        "Travel Trivia",
        "Animal Facts",
      ],
      ["movies", "music", "sports", "science", "travel", "animals"],
    );

    expect(validation.valid).toBe(true);
  });
});
