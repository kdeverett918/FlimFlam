import Anthropic from "@anthropic-ai/sdk";
import {
  type AIRequestOptions,
  type AIResponse,
  AI_MAX_RETRIES,
  AI_REQUEST_TIMEOUT_MS,
} from "@partyline/shared";
import type { ZodSchema } from "zod";
import { parseAIResponse } from "./parser";

const MODEL = "claude-sonnet-4-5-20250929";

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
  const aiDisabled = process.env.PARTYLINE_DISABLE_AI;
  if (aiDisabled === "1" || aiDisabled === "true") {
    throw new AIError("AI disabled by PARTYLINE_DISABLE_AI");
  }

  const timeoutMs = options?.timeoutMs ?? AI_REQUEST_TIMEOUT_MS;
  const maxRetries = options?.retries ?? AI_MAX_RETRIES;
  const maxTokens = options?.maxTokens ?? 4096;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const client = getClient();
      const response = await client.messages.create(
        {
          model: MODEL,
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
        lastError = new AIApiError(error.message, status);
        continue;
      }

      lastError = error instanceof Error ? error : new AIError(String(error));
    }
  }

  throw lastError ?? new AIError("AI request failed after all retries");
}
