import {
  AIApiError,
  buildModelCandidates,
  buildOpenRouterModelCandidates,
  getAnthropicAuthConfig,
  isModelUnavailableError,
  resetAnthropicClientForTests,
} from "../client";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  resetAnthropicClientForTests();
});

describe("ai/client model fallback", () => {
  it("buildModelCandidates includes explicit, env, and fallback models without duplicates", () => {
    process.env.FLIMFLAM_AI_MODEL = "claude-sonnet-4-5-20250929";
    const models = buildModelCandidates("claude-sonnet-4-5-20250929");

    expect(models).toEqual([
      "claude-sonnet-4-5-20250929",
      "claude-sonnet-4-5-latest",
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

  it("reads Anthropic auth directly from process.env", () => {
    process.env.ANTHROPIC_API_KEY = "  sk-ant-test  ";
    process.env.ANTHROPIC_AUTH_TOKEN = "  bearer-test  ";

    expect(getAnthropicAuthConfig()).toEqual({
      apiKey: "sk-ant-test",
      authToken: "bearer-test",
    });
  });

  it("omits empty Anthropic auth env values", () => {
    process.env.ANTHROPIC_API_KEY = "   ";
    process.env.ANTHROPIC_AUTH_TOKEN = "";

    expect(getAnthropicAuthConfig()).toEqual({});
  });

  it("buildOpenRouterModelCandidates prioritizes explicit and configured models", () => {
    process.env.FLIMFLAM_OPENROUTER_MODEL = "openai/gpt-5.4";

    expect(buildOpenRouterModelCandidates("openai/gpt-5.4")).toEqual([
      "openai/gpt-5.4",
      "openai/gpt-5.2",
      "openai/gpt-5-pro",
    ]);
  });

  it("buildOpenRouterModelCandidates ignores Anthropic model ids", () => {
    process.env.FLIMFLAM_OPENROUTER_MODEL = undefined;

    expect(buildOpenRouterModelCandidates("claude-opus-4-6")).toEqual([
      "openai/gpt-5.4",
      "openai/gpt-5.2",
      "openai/gpt-5-pro",
    ]);
  });
});
