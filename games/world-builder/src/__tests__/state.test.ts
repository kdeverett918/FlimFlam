import { SCORING, clampRoundPoints } from "../scoring";
import { ACTION_MAX_LENGTH, validateAction } from "../state";

describe("world-builder/state", () => {
  it("validateAction: rejects non-string and empty", () => {
    expect(validateAction(null).valid).toBe(false);
    expect(validateAction("").valid).toBe(false);
    expect(validateAction("   ").valid).toBe(false);
  });

  it("validateAction: enforces max length and trims", () => {
    const tooLong = "a".repeat(ACTION_MAX_LENGTH + 1);
    expect(validateAction(tooLong).valid).toBe(false);

    const ok = validateAction("  hello  ");
    expect(ok.valid).toBe(true);
    expect(ok.value).toBe("hello");
  });
});

describe("world-builder/scoring", () => {
  it("clampRoundPoints clamps to [0, MAX_ROUND_POINTS]", () => {
    expect(clampRoundPoints(-50)).toBe(0);
    expect(clampRoundPoints(SCORING.MAX_ROUND_POINTS + 999)).toBe(SCORING.MAX_ROUND_POINTS);
    expect(clampRoundPoints(123)).toBe(123);
  });
});
