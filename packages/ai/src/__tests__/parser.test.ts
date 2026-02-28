import { z } from "zod";
import { extractJSON, parseAIResponse, snakeToCamelCase, transformKeys } from "../parser";

describe("ai/parser", () => {
  it("extractJSON: extracts from ```json``` block", () => {
    const input = 'Here you go:\n```json\n{"a":1}\n```\nThanks!';
    expect(extractJSON(input)).toBe('{"a":1}');
  });

  it("extractJSON: extracts from generic code block containing JSON", () => {
    const input = '``` \n{"a":1,"b":2}\n```';
    expect(extractJSON(input)).toBe('{"a":1,"b":2}');
  });

  it("extractJSON: extracts first JSON object from preamble text", () => {
    const input = 'Preamble... {"a":1,"b":{"c":2}} trailing.';
    expect(extractJSON(input)).toBe('{"a":1,"b":{"c":2}}');
  });

  it("extractJSON: handles braces inside strings", () => {
    const input = 'Noise {"a":"{not json}","b":2} tail';
    expect(extractJSON(input)).toBe('{"a":"{not json}","b":2}');
  });

  it("snakeToCamelCase: converts snake_case", () => {
    expect(snakeToCamelCase("world_state_update")).toBe("worldStateUpdate");
  });

  it("transformKeys: recursively camelCases object keys", () => {
    const obj = { world_state: { time_pressure: "soon", key_resources: ["food"] } };
    expect(transformKeys(obj)).toEqual({
      worldState: { timePressure: "soon", keyResources: ["food"] },
    });
  });

  it("parseAIResponse: extracts, transforms, and validates with Zod", () => {
    const schema = z.object({
      worldState: z.object({
        timePressure: z.string(),
      }),
    });

    const text = '```json\n{"world_state":{"time_pressure":"NOW"}}\n```';
    const parsed = parseAIResponse(text, schema);
    expect(parsed.worldState.timePressure).toBe("NOW");
  });
});
