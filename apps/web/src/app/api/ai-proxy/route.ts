import {
  type AIProxySchemaKey,
  AI_PROXY_SCHEMA_KEYS,
  aiRequest,
  hashAIProxyRequestPayload,
  resolveAIProxyAuthorizeUrl,
} from "@flimflam/ai";
import {
  type AIRequestOptions,
  AnswerJudgeSchema,
  BrainBoardChatResponseSchema,
  BrainBoardGeneratedBoardSchema,
} from "@flimflam/shared";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type AIProxyRequestBody = {
  roomId?: unknown;
  token?: unknown;
  schema?: unknown;
  systemPrompt?: unknown;
  userPrompt?: unknown;
  options?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRequiredString(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new Error(`Missing ${name}.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Missing ${name}.`);
  }

  return trimmed;
}

function parseOptions(value: unknown): AIRequestOptions | undefined {
  if (value === undefined) return undefined;
  if (!isObject(value)) {
    throw new Error("Invalid AI options payload.");
  }

  const options: AIRequestOptions = {};
  if (value.maxTokens !== undefined) {
    if (typeof value.maxTokens !== "number" || !Number.isFinite(value.maxTokens)) {
      throw new Error("Invalid maxTokens value.");
    }
    options.maxTokens = value.maxTokens;
  }
  if (value.timeoutMs !== undefined) {
    if (typeof value.timeoutMs !== "number" || !Number.isFinite(value.timeoutMs)) {
      throw new Error("Invalid timeoutMs value.");
    }
    options.timeoutMs = value.timeoutMs;
  }
  if (value.retries !== undefined) {
    if (typeof value.retries !== "number" || !Number.isFinite(value.retries)) {
      throw new Error("Invalid retries value.");
    }
    options.retries = value.retries;
  }
  if (value.model !== undefined) {
    if (typeof value.model !== "string" || !value.model.trim()) {
      throw new Error("Invalid model value.");
    }
    options.model = value.model.trim();
  }

  return options;
}

function parseSchemaKey(schema: string): AIProxySchemaKey {
  switch (schema) {
    case AI_PROXY_SCHEMA_KEYS.answerJudge:
    case AI_PROXY_SCHEMA_KEYS.brainBoardChat:
    case AI_PROXY_SCHEMA_KEYS.brainBoardGeneratedBoard:
      return schema;
    default:
      throw new Error("Unsupported AI proxy schema.");
  }
}

async function requestForSchema(
  schema: AIProxySchemaKey,
  systemPrompt: string,
  userPrompt: string,
  options: AIRequestOptions | undefined,
) {
  switch (schema) {
    case AI_PROXY_SCHEMA_KEYS.answerJudge:
      return aiRequest(systemPrompt, userPrompt, AnswerJudgeSchema, options);
    case AI_PROXY_SCHEMA_KEYS.brainBoardChat:
      return aiRequest(systemPrompt, userPrompt, BrainBoardChatResponseSchema, options);
    case AI_PROXY_SCHEMA_KEYS.brainBoardGeneratedBoard:
      return aiRequest(systemPrompt, userPrompt, BrainBoardGeneratedBoardSchema, options);
  }
}

async function authorizeProxyRequest(roomId: string, token: string, requestHash: string) {
  const response = await fetch(resolveAIProxyAuthorizeUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roomId,
      token,
      requestHash,
    }),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      error:
        body && typeof body.error === "string"
          ? body.error
          : `Authorization failed with status ${response.status}.`,
    };
  }

  return { ok: true as const };
}

export async function POST(request: NextRequest) {
  let payload: AIProxyRequestBody;
  try {
    payload = (await request.json()) as AIProxyRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const roomId = readRequiredString(payload.roomId, "roomId");
    const token = readRequiredString(payload.token, "token");
    const schema = parseSchemaKey(readRequiredString(payload.schema, "schema"));
    const systemPrompt = readRequiredString(payload.systemPrompt, "systemPrompt");
    const userPrompt = readRequiredString(payload.userPrompt, "userPrompt");
    const options = parseOptions(payload.options);
    const requestHash = hashAIProxyRequestPayload({
      schema,
      systemPrompt,
      userPrompt,
      options,
    });

    const authorization = await authorizeProxyRequest(roomId, token, requestHash);
    if (!authorization.ok) {
      return NextResponse.json({ error: authorization.error }, { status: authorization.status });
    }

    const result = await requestForSchema(schema, systemPrompt, userPrompt, options);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /missing|invalid|unsupported/i.test(message) ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
