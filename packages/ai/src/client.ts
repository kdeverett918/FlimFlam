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

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic();
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

        const latencyMs = Date.now() - startTime;
        const tokensUsed = {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        };

        totalInputTokens += tokensUsed.input;
        totalOutputTokens += tokensUsed.output;

        // Extract text content from response
        let rawText = "";
        for (const block of response.content) {
          if (block.type === "text") {
            rawText += block.text;
          }
        }

        try {
          const parsed = parseAIResponse(rawText, zodSchema);
          return { raw: rawText, parsed, tokensUsed, latencyMs };
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

          // If this model is unavailable for this key/account, move to the next candidate.
          if (isModelUnavailableError(apiError)) {
            break;
          }
          continue;
        }

        lastError = error instanceof Error ? error : new AIError(String(error));
      }
    }
  }

  throw lastError ?? new AIError("AI request failed after all retries");
}
