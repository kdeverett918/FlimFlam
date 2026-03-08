import { describe, expect, it } from "vitest";

import { extractTopicSuggestions, normalizeTopicSuggestion } from "../index";

describe("Brain Board topic normalization", () => {
  it("normalizes whitespace and removes common lead-in phrases", () => {
    expect(normalizeTopicSuggestion("  I love   Movies  ")).toBe("Movies");
    expect(normalizeTopicSuggestion("How about   science ")).toBe("science");
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
});
