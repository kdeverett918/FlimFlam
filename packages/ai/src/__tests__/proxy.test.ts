import { afterEach, describe, expect, it, vi } from "vitest";

const { aiRequestMock } = vi.hoisted(() => ({
  aiRequestMock: vi.fn(),
}));

vi.mock("../client", async () => {
  const actual = await vi.importActual<typeof import("../client")>("../client");
  return {
    ...actual,
    aiRequest: aiRequestMock,
  };
});

import { AnswerJudgeSchema } from "@flimflam/shared";
import {
  AI_PROXY_SCHEMA_KEYS,
  aiRequestWithRenderFallback,
  clearAIProxyTokensForTests,
  consumeAIProxyToken,
  hashAIProxyRequestPayload,
  issueAIProxyToken,
} from "../proxy";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  clearAIProxyTokensForTests();
  aiRequestMock.mockReset();
  vi.unstubAllGlobals();
});

describe("ai proxy fallback", () => {
  it("hashes equivalent request payloads identically", () => {
    const first = hashAIProxyRequestPayload({
      schema: AI_PROXY_SCHEMA_KEYS.answerJudge,
      systemPrompt: "system",
      userPrompt: "user",
      options: {
        model: "claude-opus-4-6",
        timeoutMs: 15_000,
        retries: 1,
        maxTokens: 180,
      },
    });

    const second = hashAIProxyRequestPayload({
      schema: AI_PROXY_SCHEMA_KEYS.answerJudge,
      systemPrompt: "system",
      userPrompt: "user",
      options: {
        retries: 1,
        maxTokens: 180,
        timeoutMs: 15_000,
        model: "claude-opus-4-6",
      },
    });

    expect(first).toBe(second);
  });

  it("consumes proxy tokens only once", () => {
    const requestHash = hashAIProxyRequestPayload({
      schema: AI_PROXY_SCHEMA_KEYS.brainBoardGeneratedBoard,
      systemPrompt: "system",
      userPrompt: "user",
      options: { model: "claude-opus-4-6" },
    });

    const { token } = issueAIProxyToken("room-123", requestHash);

    expect(
      consumeAIProxyToken({
        roomId: "room-123",
        token,
        requestHash,
      }),
    ).toEqual({ ok: true });

    expect(
      consumeAIProxyToken({
        roomId: "room-123",
        token,
        requestHash,
      }),
    ).toMatchObject({ ok: false, status: 401 });
  });

  it("falls back to the Render proxy when the local AI request fails", async () => {
    process.env.NODE_ENV = "development";
    aiRequestMock.mockRejectedValue(new Error("Anthropic credentials are missing."));

    const fetchMock = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const body =
        init && typeof init.body === "string"
          ? (JSON.parse(init.body) as { token?: string; roomId?: string; schema?: string })
          : null;

      expect(body?.roomId).toBe("room-456");
      expect(body?.schema).toBe(AI_PROXY_SCHEMA_KEYS.answerJudge);
      expect(typeof body?.token).toBe("string");
      expect(body?.token?.length).toBeGreaterThan(20);

      return new Response(
        JSON.stringify({
          raw: '{"correct":true,"explanation":"close enough"}',
          parsed: {
            correct: true,
            explanation: "close enough",
          },
          tokensUsed: {
            input: 12,
            output: 6,
          },
          latencyMs: 123,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await aiRequestWithRenderFallback(
      "room-456",
      AI_PROXY_SCHEMA_KEYS.answerJudge,
      "system",
      "user",
      AnswerJudgeSchema,
      {
        timeoutMs: 2000,
        model: "claude-opus-4-6",
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.parsed.correct).toBe(true);
    expect(result.parsed.explanation).toBe("close enough");
  });

  it("does not use the proxy when AI is explicitly disabled", async () => {
    aiRequestMock.mockRejectedValue(new Error("AI disabled by FLIMFLAM_DISABLE_AI"));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      aiRequestWithRenderFallback(
        "room-disabled",
        AI_PROXY_SCHEMA_KEYS.answerJudge,
        "system",
        "user",
        AnswerJudgeSchema,
      ),
    ).rejects.toThrow("AI disabled by FLIMFLAM_DISABLE_AI");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
