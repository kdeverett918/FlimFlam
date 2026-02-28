import type { ZodSchema } from "zod";

/**
 * Extract JSON from text that may contain markdown code blocks, preamble, or raw JSON.
 */
export function extractJSON(text: string): string {
  // Try to extract from ```json ... ``` blocks
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonBlockMatch?.[1]) {
    return jsonBlockMatch[1].trim();
  }

  // Try to extract from ``` ... ``` blocks
  const codeBlockMatch = text.match(/```\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    const content = codeBlockMatch[1].trim();
    if (content.startsWith("{") || content.startsWith("[")) {
      return content;
    }
  }

  // Try to find raw JSON object or array in the text
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");

  let startIndex = -1;
  let openChar: string;
  let closeChar: string;

  if (firstBrace === -1 && firstBracket === -1) {
    return text.trim();
  }

  if (firstBrace === -1) {
    startIndex = firstBracket;
    openChar = "[";
    closeChar = "]";
  } else if (firstBracket === -1) {
    startIndex = firstBrace;
    openChar = "{";
    closeChar = "}";
  } else if (firstBrace < firstBracket) {
    startIndex = firstBrace;
    openChar = "{";
    closeChar = "}";
  } else {
    startIndex = firstBracket;
    openChar = "[";
    closeChar = "]";
  }

  // Walk through and find the matching close bracket/brace
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i] ?? "";

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === openChar) {
      depth++;
    } else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        return text.slice(startIndex, i + 1);
      }
    }
  }

  // Fallback: return from first brace/bracket to end
  return text.slice(startIndex).trim();
}

/**
 * Convert a snake_case string to camelCase.
 */
export function snakeToCamelCase(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
}

/**
 * Recursively transform all object keys from snake_case to camelCase.
 */
export function transformKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(transformKeys);
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const camelKey = snakeToCamelCase(key);
      result[camelKey] = transformKeys(value);
    }
    return result;
  }

  return obj;
}

/**
 * Full pipeline: extract JSON from AI text, parse, transform keys, and validate with Zod.
 */
export function parseAIResponse<T>(text: string, schema: ZodSchema<T>): T {
  const jsonStr = extractJSON(text);
  const parsed: unknown = JSON.parse(jsonStr);
  const transformed = transformKeys(parsed);
  return schema.parse(transformed);
}
