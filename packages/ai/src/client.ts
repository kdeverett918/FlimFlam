import Anthropic from "@anthropic-ai/sdk";
import {
  type AIRequestOptions,
  type AIResponse,
  AI_MAX_RETRIES,
  AI_REQUEST_TIMEOUT_MS,
} from "@flimflam/shared";
import type { ZodSchema } from "zod";
import { parseAIResponse } from "./parser";

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
const MODEL_FALLBACKS = ["claude-sonnet-4-5-latest", "claude-3-5-sonnet-latest"] as const;
const OPENROUTER_DEFAULT_MODEL = "openai/gpt-5.4";
const OPENROUTER_MODEL_FALLBACKS = ["openai/gpt-5.2", "openai/gpt-5-pro"] as const;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

let anthropicClient: Anthropic | null = null;

function readTrimmedEnv(name: "ANTHROPIC_API_KEY" | "ANTHROPIC_AUTH_TOKEN"): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getAnthropicAuthConfig(): { apiKey?: string; authToken?: string } {
  const apiKey = readTrimmedEnv("ANTHROPIC_API_KEY");
  const authToken = readTrimmedEnv("ANTHROPIC_AUTH_TOKEN");
  return {
    ...(apiKey ? { apiKey } : {}),
    ...(authToken ? { authToken } : {}),
  };
}

export function resetAnthropicClientForTests(): void {
  anthropicClient = null;
}

function getClient(): Anthropic {
  if (!anthropicClient) {
    const auth = getAnthropicAuthConfig();
    if (!auth.apiKey && !auth.authToken) {
      throw new AIError(
        "Anthropic credentials are missing. Expected ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN in process.env.",
      );
    }
    anthropicClient = new Anthropic(auth);
  }
  return anthropicClient;
}

// ─── Error Classes ──────────────────────────────────────────────────────

export class AIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIError";
  }
}

export class AITimeoutError extends AIError {
  constructor(timeoutMs: number) {
    super(`AI request timed out after ${timeoutMs}ms`);
    this.name = "AITimeoutError";
  }
}

export class AIApiError extends AIError {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AIApiError";
    this.statusCode = statusCode;
  }
}

export class AIParseError extends AIError {
  rawText: string;
  constructor(message: string, rawText: string) {
    super(message);
    this.name = "AIParseError";
    this.rawText = rawText;
  }
}

// ─── Token Tracking ─────────────────────────────────────────────────────

let totalInputTokens = 0;
let totalOutputTokens = 0;

export function getTokenUsage(): { input: number; output: number } {
  return { input: totalInputTokens, output: totalOutputTokens };
}

export function buildModelCandidates(explicitModel?: string): string[] {
  const models = [
    explicitModel,
    process.env.FLIMFLAM_AI_MODEL,
    DEFAULT_MODEL,
    ...MODEL_FALLBACKS,
  ].filter((model): model is string => typeof model === "string" && model.trim().length > 0);
  return [...new Set(models)];
}

export function buildOpenRouterModelCandidates(explicitModel?: string): string[] {
  const explicitOpenRouterModel =
    typeof explicitModel === "string" && explicitModel.includes("/") ? explicitModel : undefined;
  const models = [
    explicitOpenRouterModel,
    process.env.FLIMFLAM_OPENROUTER_MODEL,
    OPENROUTER_DEFAULT_MODEL,
    ...OPENROUTER_MODEL_FALLBACKS,
  ].filter((model): model is string => typeof model === "string" && model.trim().length > 0);
  return [...new Set(models)];
}

export function isModelUnavailableError(error: AIApiError): boolean {
  if (![400, 403, 404].includes(error.statusCode)) return false;
  const text = error.message.toLowerCase();
  return (
    text.includes("model") &&
    (text.includes("not found") ||
      text.includes("does not exist") ||
      text.includes("access") ||
      text.includes("permission") ||
      text.includes("unsupported"))
  );
}

function addTokenUsage(tokensUsed: { input: number; output: number }): void {
  totalInputTokens += tokensUsed.input;
  totalOutputTokens += tokensUsed.output;
}

function parseStructuredResponse<T>(
  rawText: string,
  zodSchema: ZodSchema<T>,
  tokensUsed: { input: number; output: number },
  latencyMs: number,
): AIResponse<T> {
  const parsed = parseAIResponse(rawText, zodSchema);
  addTokenUsage(tokensUsed);
  return { raw: rawText, parsed, tokensUsed, latencyMs };
}

async function requestViaAnthropic<T>(
  systemPrompt: string,
  userPrompt: string,
  zodSchema: ZodSchema<T>,
  options?: AIRequestOptions,
): Promise<AIResponse<T>> {
  const timeoutMs = options?.timeoutMs ?? AI_REQUEST_TIMEOUT_MS;
  const maxRetries = options?.retries ?? AI_MAX_RETRIES;
  const maxTokens = options?.maxTokens ?? 4096;
  const modelCandidates = buildModelCandidates(options?.model);

  let lastError: Error | null = null;

  for (const model of modelCandidates) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const client = getClient();
        const response = await client.messages.create(
          {
            model,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          },
          { signal: controller.signal },
        );

        clearTimeout(timeoutId);

        let rawText = "";
        for (const block of response.content) {
          if (block.type === "text") {
            rawText += block.text;
          }
        }

        try {
          return parseStructuredResponse(
            rawText,
            zodSchema,
            {
              input: response.usage.input_tokens,
              output: response.usage.output_tokens,
            },
            Date.now() - startTime,
          );
        } catch (parseError) {
          lastError = new AIParseError(
            `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
            rawText,
          );
        }
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === "AbortError") {
          lastError = new AITimeoutError(timeoutMs);
          continue;
        }

        if (error instanceof Anthropic.APIError || (error instanceof Error && "status" in error)) {
          const status = (error as { status?: number }).status ?? 500;
          const apiError = new AIApiError(error.message, status);
          lastError = apiError;

          if (isModelUnavailableError(apiError)) {
            break;
          }
          continue;
        }

        lastError = error instanceof Error ? error : new AIError(String(error));
      }
    }
  }

  throw lastError ?? new AIError("Anthropic request failed after all retries");
}

type OpenRouterMessageContent =
  | string
  | Array<{
      type?: string;
      text?: string;
    }>
  | undefined;

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: OpenRouterMessageContent;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: {
    message?: string;
  };
  message?: string;
};

function extractOpenRouterText(content: OpenRouterMessageContent): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (part?.type === "text" && typeof part.text === "string" ? part.text : ""))
      .join("");
  }

  return "";
}

async function requestViaOpenRouter<T>(
  systemPrompt: string,
  userPrompt: string,
  zodSchema: ZodSchema<T>,
  options?: AIRequestOptions,
): Promise<AIResponse<T>> {
  const apiKey = readOptionalEnv("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new AIError(
      "OpenRouter credentials are missing. Expected OPENROUTER_API_KEY in process.env.",
    );
  }

  const timeoutMs = options?.timeoutMs ?? AI_REQUEST_TIMEOUT_MS;
  const maxRetries = options?.retries ?? AI_MAX_RETRIES;
  const maxTokens = options?.maxTokens ?? 4096;
  const modelCandidates = buildOpenRouterModelCandidates(options?.model);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `${readOptionalEnv("OPENROUTER_BASE_URL") ?? OPENROUTER_BASE_URL}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": readOptionalEnv("OPENROUTER_HTTP_REFERER") ?? "https://flimflam.gg",
            "X-Title": readOptionalEnv("OPENROUTER_X_TITLE") ?? "FlimFlam",
          },
          body: JSON.stringify({
            model: modelCandidates[0],
            ...(modelCandidates.length > 1 ? { models: modelCandidates.slice(1) } : {}),
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      const payload = (await response.json().catch(() => null)) as OpenRouterResponse | null;
      if (!response.ok) {
        throw new AIApiError(
          payload?.error?.message ??
            payload?.message ??
            `OpenRouter request failed with status ${response.status}`,
          response.status,
        );
      }

      const rawText = extractOpenRouterText(payload?.choices?.[0]?.message?.content);
      try {
        return parseStructuredResponse(
          rawText,
          zodSchema,
          {
            input: payload?.usage?.prompt_tokens ?? 0,
            output: payload?.usage?.completion_tokens ?? 0,
          },
          Date.now() - startTime,
        );
      } catch (parseError) {
        lastError = new AIParseError(
          `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          rawText,
        );
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        lastError = new AITimeoutError(timeoutMs);
        continue;
      }

      if (error instanceof AIApiError) {
        lastError = error;
        continue;
      }

      lastError = error instanceof Error ? error : new AIError(String(error));
    }
  }

  throw lastError ?? new AIError("OpenRouter request failed after all retries");
}

// ─── Main Request Function ──────────────────────────────────────────────

/**
 * Make an AI request with retry logic, timeout, JSON extraction, and Zod validation.
 */
export async function aiRequest<T>(
  systemPrompt: string,
  userPrompt: string,
  zodSchema: ZodSchema<T>,
  options?: AIRequestOptions,
): Promise<AIResponse<T>> {
  const aiDisabled = process.env.FLIMFLAM_DISABLE_AI;
  if (aiDisabled === "1" || aiDisabled === "true") {
    throw new AIError("AI disabled by FLIMFLAM_DISABLE_AI");
  }

  let anthropicError: Error | null = null;
  try {
    return await requestViaAnthropic(systemPrompt, userPrompt, zodSchema, options);
  } catch (error) {
    anthropicError = error instanceof Error ? error : new AIError(String(error));
  }

  if (readOptionalEnv("OPENROUTER_API_KEY")) {
    try {
      return await requestViaOpenRouter(systemPrompt, userPrompt, zodSchema, options);
    } catch (error) {
      throw error instanceof Error ? error : new AIError(String(error));
    }
  }

  if (anthropicError) {
    console.warn(
      "[AI] OpenRouter fallback unavailable because OPENROUTER_API_KEY is missing from process.env.",
    );
  }

  throw anthropicError ?? new AIError("AI request failed after all retries");
}
