import { computePhaseDuration } from "@flimflam/game-engine";
import { afterEach, describe, expect, it } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("topic-chat timer floor", () => {
  it("enforces a minimum duration outside E2E", () => {
    process.env.FLIMFLAM_E2E = "0";
    process.env.FLIMFLAM_TIMER_SCALE = "0.01";

    // 60_000 * 1.0 * 0.01 = 600ms before floor; should be floored to 20s.
    expect(computePhaseDuration("topic-chat", "standard")).toBe(20_000);
  });

  it("allows short topic-chat in E2E mode", () => {
    process.env.FLIMFLAM_E2E = "1";
    process.env.FLIMFLAM_TIMER_SCALE = "0.01";

    expect(computePhaseDuration("topic-chat", "standard")).toBe(600);
  });

  it("respects FLIMFLAM_TOPIC_CHAT_MIN_MS override", () => {
    process.env.FLIMFLAM_E2E = "0";
    process.env.FLIMFLAM_TIMER_SCALE = "0.01";
    process.env.FLIMFLAM_TOPIC_CHAT_MIN_MS = "5000";

    expect(computePhaseDuration("topic-chat", "standard")).toBe(5_000);
  });
});
