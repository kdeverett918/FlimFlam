import { DEFAULT_PHASE_TIMERS } from "@flimflam/shared";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { computePhaseDuration, computeTimerEndTimestamp, getRoundCount } from "../TimerSystem";

const ORIGINAL_ENV = { ...process.env };

describe("game-engine/TimerSystem", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("computes scaled phase durations and clamps invalid scale", () => {
    process.env.FLIMFLAM_TIMER_SCALE = "2";
    expect(computePhaseDuration("reveal", "standard")).toBe((DEFAULT_PHASE_TIMERS.reveal ?? 0) * 2);

    process.env.FLIMFLAM_TIMER_SCALE = "not-a-number";
    expect(computePhaseDuration("reveal", "standard")).toBe(DEFAULT_PHASE_TIMERS.reveal);
  });

  it("falls back for unknown phase and warns", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.FLIMFLAM_TIMER_SCALE = "1";

    expect(computePhaseDuration("missing-phase", "kids")).toBe(45_000);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("enforces minimum duration and topic-chat floor in non-e2e mode", () => {
    process.env.FLIMFLAM_TIMER_SCALE = "0.001";
    process.env.FLIMFLAM_E2E = "0";
    process.env.FLIMFLAM_TOPIC_CHAT_MIN_MS = "25000";

    expect(computePhaseDuration("reveal", "advanced")).toBe(250);
    expect(computePhaseDuration("topic-chat", "advanced")).toBe(25_000);
  });

  it("does not enforce topic-chat floor during e2e", () => {
    process.env.FLIMFLAM_TIMER_SCALE = "0.001";
    process.env.FLIMFLAM_E2E = "1";
    process.env.FLIMFLAM_TOPIC_CHAT_MIN_MS = "50000";

    expect(computePhaseDuration("topic-chat", "standard")).toBe(600);
  });

  it("computes timer end timestamps from Date.now", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    process.env.FLIMFLAM_TIMER_SCALE = "1";

    expect(computeTimerEndTimestamp("reveal", "advanced")).toBe(1_011_250);
  });

  it("returns configured round counts and custom positive overrides", () => {
    expect(getRoundCount("kids")).toBe(3);
    expect(getRoundCount("standard")).toBe(5);
    expect(getRoundCount("advanced")).toBe(7);

    expect(getRoundCount("kids", 4)).toBe(4);
    expect(getRoundCount("kids", 0)).toBe(3);
    expect(getRoundCount("kids", -2)).toBe(3);
  });
});
