import { AIApiError, buildModelCandidates, isModelUnavailableError } from "../client";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("ai/client model fallback", () => {
  it("buildModelCandidates includes explicit, env, and fallback models without duplicates", () => {
    process.env.FLIMFLAM_AI_MODEL = "claude-opus-4-6";
    const models = buildModelCandidates("claude-opus-4-6");

    expect(models).toEqual([
      "claude-opus-4-6",
      "claude-sonnet-4-20250514",
      "claude-sonnet-4-5-20250514",
    ]);
  });

  it("buildModelCandidates works when no explicit model is provided", () => {
    process.env.FLIMFLAM_AI_MODEL = undefined;
    const models = buildModelCandidates();

    expect(models[0]).toBe("claude-opus-4-6");
    expect(models).toContain("claude-sonnet-4-20250514");
    expect(models).toContain("claude-sonnet-4-5-20250514");
  });

  it("detects model-unavailable API errors", () => {
    const unavailable = new AIApiError("Model not found: claude-sonnet-x", 404);
    const other = new AIApiError("Rate limit exceeded", 429);

    expect(isModelUnavailableError(unavailable)).toBe(true);
    expect(isModelUnavailableError(other)).toBe(false);
  });
});
