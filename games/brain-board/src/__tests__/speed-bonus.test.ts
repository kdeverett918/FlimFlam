import { describe, expect, it } from "vitest";

import { computeSpeedBonus } from "../index";

const TIMER_DURATION_MS = 20_000; // matches bb-answer default

describe("Brain Board speed bonus", () => {
  it("awards 20% bonus for fast correct answers (< 30% of timer)", () => {
    // 3 seconds is 15% of 20s timer — qualifies
    const bonus = computeSpeedBonus(true, 3_000, TIMER_DURATION_MS, 600);
    expect(bonus).toBe(120); // 600 * 0.2
  });

  it("awards bonus at boundary just under 30%", () => {
    // 5999ms is just under 30% of 20000ms (6000ms threshold)
    const bonus = computeSpeedBonus(true, 5_999, TIMER_DURATION_MS, 1000);
    expect(bonus).toBe(200); // 1000 * 0.2
  });

  it("does not award bonus at exactly 30% of timer", () => {
    // Exactly 30% — not strictly less than
    const bonus = computeSpeedBonus(true, 6_000, TIMER_DURATION_MS, 1000);
    expect(bonus).toBe(0);
  });

  it("does not award bonus for slow correct answers", () => {
    // 12 seconds is 60% of 20s timer — too slow
    const bonus = computeSpeedBonus(true, 12_000, TIMER_DURATION_MS, 800);
    expect(bonus).toBe(0);
  });

  it("does not award bonus for wrong answers even if fast", () => {
    const bonus = computeSpeedBonus(false, 1_000, TIMER_DURATION_MS, 600);
    expect(bonus).toBe(0);
  });

  it("does not award bonus when responseTimeMs is undefined", () => {
    const bonus = computeSpeedBonus(true, undefined, TIMER_DURATION_MS, 600);
    expect(bonus).toBe(0);
  });

  it("does not award bonus when timer duration is zero", () => {
    const bonus = computeSpeedBonus(true, 1_000, 0, 600);
    expect(bonus).toBe(0);
  });

  it("rounds bonus to nearest integer", () => {
    // 200 * 0.2 = 40, clean
    expect(computeSpeedBonus(true, 1_000, TIMER_DURATION_MS, 200)).toBe(40);
    // 201 * 0.2 = 40.2, rounds to 40
    expect(computeSpeedBonus(true, 1_000, TIMER_DURATION_MS, 201)).toBe(40);
    // 203 * 0.2 = 40.6, rounds to 41
    expect(computeSpeedBonus(true, 1_000, TIMER_DURATION_MS, 203)).toBe(41);
  });

  it("scales with different clue values", () => {
    expect(computeSpeedBonus(true, 2_000, TIMER_DURATION_MS, 200)).toBe(40);
    expect(computeSpeedBonus(true, 2_000, TIMER_DURATION_MS, 400)).toBe(80);
    expect(computeSpeedBonus(true, 2_000, TIMER_DURATION_MS, 1000)).toBe(200);
    expect(computeSpeedBonus(true, 2_000, TIMER_DURATION_MS, 2000)).toBe(400);
  });
});
