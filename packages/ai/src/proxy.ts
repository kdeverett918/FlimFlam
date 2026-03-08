import { createHash, randomBytes } from "node:crypto";
import { type AIRequestOptions, type AIResponse, wsUrlToHttpUrl } from "@flimflam/shared";
import type { ZodSchema } from "zod";
import { AIError, aiRequest } from "./client";

export const AI_PROXY_ROUTE_PATH = "/api/ai-proxy";
export const AI_PROXY_AUTHORIZE_ROUTE_PATH = "/api/internal/ai-proxy/authorize";

const AI_PROXY_TOKEN_TTL_MS = 90_000;
const AI_PROXY_NETWORK_BUFFER_MS = 5_000;
const MAX_AI_PROXY_TOKENS = 10_000;

export const AI_PROXY_SCHEMA_KEYS = {
  answerJudge: "answer-judge",
  brainBoardChat: "brain-board-chat",
  brainBoardGeneratedBoard: "brain-board-generated-board",
} as const;

export type AIProxySchemaKey = (typeof AI_PROXY_SCHEMA_KEYS)[keyof typeof AI_PROXY_SCHEMA_KEYS];

export interface AIProxyRequestPayload {
  roomId: string;
  schema: AIProxySchemaKey;
  systemPrompt: string;
  userPrompt: string;
  options?: AIRequestOptions;
}

type AIProxyTokenRecord = {
  roomId: string;
  requestHash: string;
  expiresAt: number;
};

type AIProxyResponseShape<_T> = {
  raw?: unknown;
  parsed?: unknown;
  tokensUsed?: {
    input?: unknown;
    output?: unknown;
  };
  latencyMs?: unknown;
};

const aiProxyTokens = new Map<string, AIProxyTokenRecord>();

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, "");
}

function sortSerializableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : sortSerializableValue(item)));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, sortSerializableValue(entryValue)]);
    return Object.fromEntries(entries);
  }

  return value;
}

function cleanupExpiredAIProxyTokens(now = Date.now()): void {
  if (aiProxyTokens.size === 0) return;

  for (const [token, record] of aiProxyTokens) {
    if (record.expiresAt <= now) {
      aiProxyTokens.delete(token);
    }
  }
}

export function clearAIProxyTokensForTests(): void {
  aiProxyTokens.clear();
}

export function buildAIProxyRequestHashInput(
  payload: Omit<AIProxyRequestPayload, "roomId">,
): string {
  return JSON.stringify(sortSerializableValue(payload));
}

export function hashAIProxyRequestPayload(payload: Omit<AIProxyRequestPayload, "roomId">): string {
  return createHash("sha256").update(buildAIProxyRequestHashInput(payload)).digest("hex");
}

export function issueAIProxyToken(
  roomId: string,
  requestHash: string,
): {
  token: string;
  expiresAt: number;
} {
  const now = Date.now();
  cleanupExpiredAIProxyTokens(now);

  if (aiProxyTokens.size >= MAX_AI_PROXY_TOKENS) {
    cleanupExpiredAIProxyTokens(now);
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = now + AI_PROXY_TOKEN_TTL_MS;
  aiProxyTokens.set(token, {
    roomId,
    requestHash,
    expiresAt,
  });

  return { token, expiresAt };
}

export function consumeAIProxyToken(input: {
  roomId: string;
  token: string;
  requestHash: string;
  now?: number;
}):
  | { ok: true }
  | {
      ok: false;
      error: string;
      status: 400 | 401 | 410;
    } {
  const now = input.now ?? Date.now();
  cleanupExpiredAIProxyTokens(now);

  const roomId = input.roomId.trim();
  const token = input.token.trim();
  const requestHash = input.requestHash.trim();

  if (!roomId || !token || !requestHash) {
    return { ok: false, error: "Missing roomId, token, or requestHash.", status: 400 };
  }

  const record = aiProxyTokens.get(token);
  if (!record) {
    return { ok: false, error: "Unknown or expired AI proxy token.", status: 401 };
  }

  aiProxyTokens.delete(token);

  if (record.expiresAt <= now) {
    return { ok: false, error: "AI proxy token expired.", status: 410 };
  }

  if (record.roomId !== roomId || record.requestHash !== requestHash) {
    return { ok: false, error: "AI proxy token did not match the request.", status: 401 };
  }

  return { ok: true };
}

export function resolveAIProxyBaseUrl(): string {
  return (
    readOptionalEnv("FLIMFLAM_AI_PROXY_BASE_URL") ??
    readOptionalEnv("NEXT_PUBLIC_HOST_URL") ??
    (process.env.NODE_ENV === "production" ? "https://flimflam.gg" : "http://127.0.0.1:3000")
  );
}

export function resolveAIProxyAuthorizeUrl(): string {
  const explicitHttpUrl = readOptionalEnv("FLIMFLAM_COLYSEUS_HTTP_URL");
  if (explicitHttpUrl) {
    return `${stripTrailingSlash(explicitHttpUrl)}${AI_PROXY_AUTHORIZE_ROUTE_PATH}`;
  }

  const publicWsUrl = readOptionalEnv("NEXT_PUBLIC_COLYSEUS_URL");
  if (publicWsUrl) {
    return `${stripTrailingSlash(wsUrlToHttpUrl(publicWsUrl))}${AI_PROXY_AUTHORIZE_ROUTE_PATH}`;
  }

  const defaultBaseUrl =
    process.env.NODE_ENV === "production"
      ? "https://us-dfw-baad7ee4.colyseus.cloud"
      : "http://127.0.0.1:2567";
  return `${defaultBaseUrl}${AI_PROXY_AUTHORIZE_ROUTE_PATH}`;
}

function shouldSkipProxyFallback(error: Error): boolean {
  return error.message.includes("AI disabled by FLIMFLAM_DISABLE_AI");
}

function normalizeAIProxyResponse<T>(
  payload: AIProxyResponseShape<T>,
  zodSchema: ZodSchema<T>,
): AIResponse<T> {
  if (typeof payload.raw !== "string") {
    throw new AIError("AI proxy response was missing raw output text.");
  }

  const tokensUsed = payload.tokensUsed;
  if (
    !tokensUsed ||
    typeof tokensUsed.input !== "number" ||
    typeof tokensUsed.output !== "number"
  ) {
    throw new AIError("AI proxy response was missing token usage details.");
  }

  if (typeof payload.latencyMs !== "number") {
    throw new AIError("AI proxy response was missing latency information.");
  }

  return {
    raw: payload.raw,
    parsed: zodSchema.parse(payload.parsed),
    tokensUsed: {
      input: tokensUsed.input,
      output: tokensUsed.output,
    },
    latencyMs: payload.latencyMs,
  };
}

async function requestViaAIProxy<T>(
  payload: AIProxyRequestPayload,
  zodSchema: ZodSchema<T>,
): Promise<AIResponse<T>> {
  const { roomId, ...hashInput } = payload;
  const requestHash = hashAIProxyRequestPayload(hashInput);
  const { token } = issueAIProxyToken(roomId, requestHash);
  const timeoutMs = (payload.options?.timeoutMs ?? 30_000) + AI_PROXY_NETWORK_BUFFER_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${resolveAIProxyBaseUrl()}${AI_PROXY_ROUTE_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        token,
      }),
      signal: controller.signal,
    });

    const text = await response.text();
    let parsedJson: AIProxyResponseShape<T> | { error?: unknown } | null = null;
    if (text) {
      try {
        parsedJson = JSON.parse(text) as AIProxyResponseShape<T> | { error?: unknown };
      } catch {
        parsedJson = null;
      }
    }

    if (!response.ok) {
      const errorMessage =
        parsedJson &&
        typeof parsedJson === "object" &&
        "error" in parsedJson &&
        typeof parsedJson.error === "string"
          ? parsedJson.error
          : text || `AI proxy request failed with status ${response.status}`;
      throw new AIError(errorMessage);
    }

    if (!parsedJson || typeof parsedJson !== "object") {
      throw new AIError("AI proxy returned an empty or invalid JSON response.");
    }

    return normalizeAIProxyResponse(parsedJson as AIProxyResponseShape<T>, zodSchema);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AIError(`AI proxy request timed out after ${timeoutMs}ms`);
    }
    throw error instanceof Error ? error : new AIError(String(error));
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function aiRequestWithRenderFallback<T>(
  roomId: string,
  schema: AIProxySchemaKey,
  systemPrompt: string,
  userPrompt: string,
  zodSchema: ZodSchema<T>,
  options?: AIRequestOptions,
): Promise<AIResponse<T>> {
  let localError: Error | null = null;

  try {
    return await aiRequest(systemPrompt, userPrompt, zodSchema, options);
  } catch (error) {
    localError = error instanceof Error ? error : new AIError(String(error));
  }

  if (!localError || shouldSkipProxyFallback(localError)) {
    throw localError ?? new AIError("AI request failed before proxy fallback could run.");
  }

  console.warn("[AI] Local AI request failed, retrying via Render proxy.", {
    roomId,
    schema,
    error: localError.message,
  });

  try {
    return await requestViaAIProxy(
      {
        roomId,
        schema,
        systemPrompt,
        userPrompt,
        options,
      },
      zodSchema,
    );
  } catch (proxyError) {
    const proxyMessage = proxyError instanceof Error ? proxyError.message : String(proxyError);
    throw new AIError(
      `AI request failed locally and via Render proxy. Local error: ${localError.message}. Proxy error: ${proxyMessage}`,
    );
  }
}
