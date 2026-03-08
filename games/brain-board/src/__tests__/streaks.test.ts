import { describe, expect, it } from "vitest";

import { updateStreak } from "../index";

describe("Brain Board streak tracking", () => {
  it("increments streak on consecutive correct answers", () => {
    const streaks = new Map<string, number>();
    const maxStreaks = new Map<string, number>();
    const sid = "player-1";

    expect(updateStreak(streaks, maxStreaks, sid, true)).toBe(1);
    expect(updateStreak(streaks, maxStreaks, sid, true)).toBe(2);
    expect(updateStreak(streaks, maxStreaks, sid, true)).toBe(3);

    expect(streaks.get(sid)).toBe(3);
    expect(maxStreaks.get(sid)).toBe(3);
  });

  it("resets streak on wrong answer", () => {
    const streaks = new Map<string, number>();
    const maxStreaks = new Map<string, number>();
    const sid = "player-1";

    updateStreak(streaks, maxStreaks, sid, true);
    updateStreak(streaks, maxStreaks, sid, true);
    expect(streaks.get(sid)).toBe(2);

    expect(updateStreak(streaks, maxStreaks, sid, false)).toBe(0);
    expect(streaks.get(sid)).toBe(0);
  });

  it("preserves max streak after reset", () => {
    const streaks = new Map<string, number>();
    const maxStreaks = new Map<string, number>();
    const sid = "player-1";

    // Build a 4-streak
    updateStreak(streaks, maxStreaks, sid, true);
    updateStreak(streaks, maxStreaks, sid, true);
    updateStreak(streaks, maxStreaks, sid, true);
    updateStreak(streaks, maxStreaks, sid, true);
    expect(maxStreaks.get(sid)).toBe(4);

    // Break it
    updateStreak(streaks, maxStreaks, sid, false);
    expect(streaks.get(sid)).toBe(0);
    expect(maxStreaks.get(sid)).toBe(4);

    // Build a shorter streak — max should stay at 4
    updateStreak(streaks, maxStreaks, sid, true);
    updateStreak(streaks, maxStreaks, sid, true);
    expect(streaks.get(sid)).toBe(2);
    expect(maxStreaks.get(sid)).toBe(4);
  });

  it("tracks streaks independently per player", () => {
    const streaks = new Map<string, number>();
    const maxStreaks = new Map<string, number>();

    updateStreak(streaks, maxStreaks, "p1", true);
    updateStreak(streaks, maxStreaks, "p1", true);
    updateStreak(streaks, maxStreaks, "p2", true);
    updateStreak(streaks, maxStreaks, "p2", false);

    expect(streaks.get("p1")).toBe(2);
    expect(streaks.get("p2")).toBe(0);
    expect(maxStreaks.get("p1")).toBe(2);
    expect(maxStreaks.get("p2")).toBe(1);
  });

  it("updates max streak when new streak exceeds previous max", () => {
    const streaks = new Map<string, number>();
    const maxStreaks = new Map<string, number>();
    const sid = "player-1";

    // First streak of 2
    updateStreak(streaks, maxStreaks, sid, true);
    updateStreak(streaks, maxStreaks, sid, true);
    updateStreak(streaks, maxStreaks, sid, false);
    expect(maxStreaks.get(sid)).toBe(2);

    // New streak of 3 — max should update
    updateStreak(streaks, maxStreaks, sid, true);
    updateStreak(streaks, maxStreaks, sid, true);
    updateStreak(streaks, maxStreaks, sid, true);
    expect(maxStreaks.get(sid)).toBe(3);
  });
});
