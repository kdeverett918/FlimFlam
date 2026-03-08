import { describe, expect, it } from "vitest";

/**
 * Tests for the board logic in InteractiveBoard.
 * We replicate the cell-state computation and values logic without rendering.
 */

type CellState =
  | "available"
  | "read-only"
  | "answered-correct"
  | "answered-wrong"
  | "answered-neutral";

const CLUE_VALUES = [200, 400, 600, 800, 1000];
const DOUBLE_DOWN_VALUES = [400, 800, 1200, 1600, 2000];

function computeCellState(
  clueId: string,
  answeredClues: Set<string>,
  clueOutcomes: Map<string, "correct" | "wrong"> | undefined,
  isSelector: boolean,
): CellState {
  const isAnswered = answeredClues.has(clueId);
  if (isAnswered) {
    const outcome = clueOutcomes?.get(clueId);
    return outcome === "correct"
      ? "answered-correct"
      : outcome === "wrong"
        ? "answered-wrong"
        : "answered-neutral";
  }
  return isSelector ? "available" : "read-only";
}

function getValues(doubleDownValues: boolean): number[] {
  return doubleDownValues ? DOUBLE_DOWN_VALUES : CLUE_VALUES;
}

// ─── Cell state computation ──────────────────────────────────────────────────

describe("cell state computation", () => {
  it("answered clue with correct outcome → answered-correct", () => {
    const answered = new Set(["2,3"]);
    const outcomes = new Map<string, "correct" | "wrong">([["2,3", "correct"]]);
    expect(computeCellState("2,3", answered, outcomes, false)).toBe("answered-correct");
  });

  it("answered clue with wrong outcome → answered-wrong", () => {
    const answered = new Set(["1,0"]);
    const outcomes = new Map<string, "correct" | "wrong">([["1,0", "wrong"]]);
    expect(computeCellState("1,0", answered, outcomes, false)).toBe("answered-wrong");
  });

  it("answered clue with no outcome → answered-neutral", () => {
    const answered = new Set(["0,2"]);
    const outcomes = new Map<string, "correct" | "wrong">();
    expect(computeCellState("0,2", answered, outcomes, false)).toBe("answered-neutral");
  });

  it("answered clue with undefined outcomes map → answered-neutral", () => {
    const answered = new Set(["3,1"]);
    expect(computeCellState("3,1", answered, undefined, true)).toBe("answered-neutral");
  });

  it("non-answered clue for selector → available", () => {
    const answered = new Set<string>();
    expect(computeCellState("0,0", answered, undefined, true)).toBe("available");
  });

  it("non-answered clue for non-selector → read-only", () => {
    const answered = new Set<string>();
    expect(computeCellState("0,0", answered, undefined, false)).toBe("read-only");
  });

  it("cell state is answered even if isSelector is true", () => {
    const answered = new Set(["4,2"]);
    const outcomes = new Map<string, "correct" | "wrong">([["4,2", "correct"]]);
    expect(computeCellState("4,2", answered, outcomes, true)).toBe("answered-correct");
  });
});

// ─── Values array ────────────────────────────────────────────────────────────

describe("values array", () => {
  it("returns standard values when doubleDownValues is false", () => {
    expect(getValues(false)).toEqual([200, 400, 600, 800, 1000]);
  });

  it("returns doubled values when doubleDownValues is true", () => {
    expect(getValues(true)).toEqual([400, 800, 1200, 1600, 2000]);
  });

  it("both arrays have exactly 5 entries", () => {
    expect(getValues(false)).toHaveLength(5);
    expect(getValues(true)).toHaveLength(5);
  });

  it("doubled values are exactly 2x the standard values", () => {
    const standard = getValues(false);
    const doubled = getValues(true);
    for (let i = 0; i < standard.length; i++) {
      expect(doubled[i]).toBe((standard[i] ?? 0) * 2);
    }
  });
});
