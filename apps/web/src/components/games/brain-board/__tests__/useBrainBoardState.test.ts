import { describe, expect, it } from "vitest";

/**
 * Tests for the state derivation logic used by useBrainBoardState.
 * We test the pure logic directly rather than the React hook (no @testing-library/react).
 */

// ─── resolvedPhase fallback chain ────────────────────────────────────────────

describe("resolvedPhase derivation", () => {
  function resolvedPhase(
    boardStatePhase: string | undefined,
    gsPhase: string | undefined,
    propsPhase: string,
  ): string {
    return typeof boardStatePhase === "string"
      ? boardStatePhase
      : typeof gsPhase === "string"
        ? gsPhase
        : propsPhase;
  }

  it("uses boardState.phase when available", () => {
    expect(resolvedPhase("clue-select", "answering", "lobby")).toBe("clue-select");
  });

  it("falls back to gs.phase when boardState.phase is undefined", () => {
    expect(resolvedPhase(undefined, "answering", "lobby")).toBe("answering");
  });

  it("falls back to props.phase when both are undefined", () => {
    expect(resolvedPhase(undefined, undefined, "lobby")).toBe("lobby");
  });
});

// ─── bbStandings extraction ──────────────────────────────────────────────────

describe("bbStandings extraction", () => {
  function extractStandings(
    boardStateStandings: unknown,
    gsStandings: unknown,
  ): Array<{ sessionId: string; score: number }> {
    const source = boardStateStandings ?? gsStandings;
    return Array.isArray(source) ? (source as Array<{ sessionId: string; score: number }>) : [];
  }

  it("returns boardState standings when present", () => {
    const standings = [{ sessionId: "p1", score: 500 }];
    expect(extractStandings(standings, [])).toEqual(standings);
  });

  it("falls back to gs standings", () => {
    const gsStandings = [{ sessionId: "p2", score: 300 }];
    expect(extractStandings(undefined, gsStandings)).toEqual(gsStandings);
  });

  it("returns empty array when neither exists", () => {
    expect(extractStandings(undefined, undefined)).toEqual([]);
  });

  it("returns empty array for non-array values", () => {
    expect(extractStandings("not-array", null)).toEqual([]);
  });
});

// ─── selectorName resolution ─────────────────────────────────────────────────

describe("selectorName resolution", () => {
  function resolveSelectorName(
    selectorSessionId: string | null,
    players: Array<{ sessionId: string; name: string }>,
  ): string | null {
    return selectorSessionId
      ? (players.find((p) => p.sessionId === selectorSessionId)?.name ?? null)
      : null;
  }

  it("resolves name from matching player", () => {
    const players = [
      { sessionId: "s1", name: "Alice" },
      { sessionId: "s2", name: "Bob" },
    ];
    expect(resolveSelectorName("s2", players)).toBe("Bob");
  });

  it("returns null when no matching player", () => {
    expect(resolveSelectorName("s99", [{ sessionId: "s1", name: "Alice" }])).toBeNull();
  });

  it("returns null when selectorSessionId is null", () => {
    expect(resolveSelectorName(null, [{ sessionId: "s1", name: "Alice" }])).toBeNull();
  });
});

// ─── isMyTurn derivation ─────────────────────────────────────────────────────

describe("isMyTurn derivation", () => {
  function isMyTurn(pd: Record<string, unknown>): boolean {
    return pd.isSelector === true || pd.isPowerPlayPlayer === true;
  }

  it("true when isSelector is true", () => {
    expect(isMyTurn({ isSelector: true })).toBe(true);
  });

  it("true when isPowerPlayPlayer is true", () => {
    expect(isMyTurn({ isPowerPlayPlayer: true })).toBe(true);
  });

  it("false when neither flag is true", () => {
    expect(isMyTurn({})).toBe(false);
    expect(isMyTurn({ isSelector: false, isPowerPlayPlayer: false })).toBe(false);
  });
});

// ─── clueOutcomes tracking logic ─────────────────────────────────────────────

describe("clueOutcomes tracking", () => {
  it("maps a newly revealed clue key to correct when result has correct entry", () => {
    const outcomes = new Map<string, "correct" | "wrong">();
    const clueKey = "2,3";
    const results = [{ correct: true }, { correct: false }];
    const anyCorrect = results.some((r) => r.correct);
    outcomes.set(clueKey, anyCorrect ? "correct" : "wrong");
    expect(outcomes.get("2,3")).toBe("correct");
  });

  it("maps clue key to wrong when no result is correct", () => {
    const outcomes = new Map<string, "correct" | "wrong">();
    const clueKey = "1,0";
    const results = [{ correct: false }, { correct: false }];
    const anyCorrect = results.some((r) => r.correct);
    outcomes.set(clueKey, anyCorrect ? "correct" : "wrong");
    expect(outcomes.get("1,0")).toBe("wrong");
  });

  it("accumulates multiple outcomes across clues", () => {
    const outcomes = new Map<string, "correct" | "wrong">();
    outcomes.set("0,0", "correct");
    outcomes.set("1,2", "wrong");
    outcomes.set("3,4", "correct");
    expect(outcomes.size).toBe(3);
    expect(outcomes.get("0,0")).toBe("correct");
    expect(outcomes.get("1,2")).toBe("wrong");
  });
});
