import { AIApiError, buildModelCandidates, isModelUnavailableError } from "../client";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("ai/client model fallback", () => {
  it("buildModelCandidates includes explicit, env, and fallback models without duplicates", () => {
    process.env.FLIMFLAM_AI_MODEL = "claude-sonnet-4-5-latest";
    const models = buildModelCandidates("claude-sonnet-4-5-latest");

    expect(models).toEqual([
      "claude-sonnet-4-5-latest",
      "claude-sonnet-4-5-20250929",
      "claude-3-5-sonnet-latest",
    ]);
  });

  it("buildModelCandidates works when no explicit model is provided", () => {
    process.env.FLIMFLAM_AI_MODEL = undefined;
    const models = buildModelCandidates();

    expect(models[0]).toBe("claude-sonnet-4-5-20250929");
    expect(models).toContain("claude-sonnet-4-5-latest");
    expect(models).toContain("claude-3-5-sonnet-latest");
  });

  it("detects model-unavailable API errors", () => {
    const unavailable = new AIApiError("Model not found: claude-sonnet-x", 404);
    const other = new AIApiError("Rate limit exceeded", 429);

    expect(isModelUnavailableError(unavailable)).toBe(true);
    expect(isModelUnavailableError(other)).toBe(false);
  });
});
