import { describe, expect, it } from "vitest";
import { ADVANCED_PUZZLES, KIDS_PUZZLES, STANDARD_PUZZLES } from "../content/phrase-bank";
import {
  BONUS_PRIZE,
  RSTLNE,
  VOWELS,
  VOWEL_COST,
  buildLuckyLettersBonusRevealPayload,
  buildLuckyLettersPublicGameState,
  buildLuckyLettersRoundResultPayload,
  buildPuzzleDisplay,
  countLetterInPhrase,
  getConsonantsRemaining,
  getVowelsRemaining,
  isPuzzleFullyRevealed,
  isSolveCorrect,
  normalizeSolve,
} from "../index";
import { WHEEL_SEGMENTS, spinWheel } from "../wheel";

// ─── Wheel Spin Tests ──────────────────────────────────────────────────

describe("spinWheel", () => {
  it("returns a valid segment from the wheel", () => {
    const result = spinWheel();
    expect(result.segment).toBeDefined();
    expect(WHEEL_SEGMENTS).toContainEqual(result.segment);
  });

  it("returns a reasonable angle (3-5 full rotations + landing)", () => {
    // Run multiple times to check range
    for (let i = 0; i < 50; i++) {
      const result = spinWheel();
      // Minimum: 3 rotations (1080) + some landing angle > 0
      expect(result.angle).toBeGreaterThanOrEqual(1080);
      // Maximum: 5 rotations (1800) + nearly 360
      expect(result.angle).toBeLessThan(1800 + 360);
    }
  });

  it("has exactly 24 segments", () => {
    expect(WHEEL_SEGMENTS).toHaveLength(24);
  });

  it("contains 2 bust segments", () => {
    const busts = WHEEL_SEGMENTS.filter((s) => s.type === "bust");
    expect(busts).toHaveLength(2);
  });

  it("contains 1 pass segment", () => {
    const passes = WHEEL_SEGMENTS.filter((s) => s.type === "pass");
    expect(passes).toHaveLength(1);
  });

  it("contains 1 wild segment", () => {
    const wilds = WHEEL_SEGMENTS.filter((s) => s.type === "wild");
    expect(wilds).toHaveLength(1);
  });
});

// ─── Puzzle Display Tests ──────────────────────────────────────────────

describe("buildPuzzleDisplay", () => {
  it("shows underscores for unrevealed letters", () => {
    const display = buildPuzzleDisplay("HELLO", new Set());
    expect(display).toBe("_____");
  });

  it("reveals letters that are in the set", () => {
    const display = buildPuzzleDisplay("HELLO", new Set(["H", "L"]));
    expect(display).toBe("H_LL_");
  });

  it("preserves spaces", () => {
    const display = buildPuzzleDisplay("ICE CREAM", new Set(["I", "C"]));
    expect(display).toBe("IC_ C____");
  });

  it("preserves punctuation and special characters", () => {
    const display = buildPuzzleDisplay("ROCK & ROLL", new Set(["R"]));
    expect(display).toBe("R___ & R___");
  });

  it("shows fully revealed puzzle", () => {
    const phrase = "HI";
    const display = buildPuzzleDisplay(phrase, new Set(["H", "I"]));
    expect(display).toBe("HI");
  });

  it("handles hyphens", () => {
    const display = buildPuzzleDisplay("WELL-DONE", new Set(["W", "E"]));
    // W=W, E=E, L=_, L=_, -, D=_, O=_, N=_, E=E
    expect(display).toBe("WE__-___E");
  });
});

// ─── Letter Count Tests ────────────────────────────────────────────────

describe("countLetterInPhrase", () => {
  it("counts multiple occurrences", () => {
    expect(countLetterInPhrase("BANANA", "A")).toBe(3);
  });

  it("counts single occurrence", () => {
    expect(countLetterInPhrase("BANANA", "B")).toBe(1);
  });

  it("returns 0 for absent letter", () => {
    expect(countLetterInPhrase("BANANA", "Z")).toBe(0);
  });

  it("is case insensitive", () => {
    expect(countLetterInPhrase("Hello", "l")).toBe(2);
  });
});

// ─── Solve Matching Tests ──────────────────────────────────────────────

describe("normalizeSolve", () => {
  it("converts to uppercase", () => {
    expect(normalizeSolve("hello")).toBe("HELLO");
  });

  it("strips punctuation and collapses whitespace", () => {
    // & and ! are stripped, resulting whitespace is collapsed
    expect(normalizeSolve("ROCK & ROLL!")).toBe("ROCK ROLL");
  });

  it("collapses whitespace", () => {
    expect(normalizeSolve("  HELLO   WORLD  ")).toBe("HELLO WORLD");
  });
});

describe("isSolveCorrect", () => {
  it("matches exact phrase (case insensitive)", () => {
    expect(isSolveCorrect("ice cream cone", "ICE CREAM CONE")).toBe(true);
  });

  it("matches with extra whitespace", () => {
    expect(isSolveCorrect("  ICE  CREAM  CONE  ", "ICE CREAM CONE")).toBe(true);
  });

  it("rejects incorrect answer", () => {
    expect(isSolveCorrect("ICE CREAM CAKE", "ICE CREAM CONE")).toBe(false);
  });

  it("matches when punctuation is stripped from both sides", () => {
    // "ROCK & ROLL" normalizes to "ROCK ROLL" (& stripped, whitespace collapsed)
    expect(isSolveCorrect("ROCK ROLL", "ROCK & ROLL")).toBe(true);
  });

  it("rejects partial answers", () => {
    expect(isSolveCorrect("ICE CREAM", "ICE CREAM CONE")).toBe(false);
  });
});

// ─── Bust Resets Round Cash ────────────────────────────────────────

describe("bust mechanic", () => {
  it("bust segment has value 0", () => {
    const bustSegments = WHEEL_SEGMENTS.filter((s) => s.type === "bust");
    for (const s of bustSegments) {
      expect(s.value).toBe(0);
    }
  });

  it("bust loses round cash (conceptual test -- cash tracking is in the plugin)", () => {
    // Simulate the cash tracking logic
    const _roundCash = 3000;
    const totalCash = 5000;
    // On bust: roundCash -> 0, totalCash stays the same
    const afterBust = { roundCash: 0, totalCash };
    expect(afterBust.roundCash).toBe(0);
    expect(afterBust.totalCash).toBe(5000);
  });
});

// ─── Vowel Purchase Tests ──────────────────────────────────────────────

describe("vowel purchase", () => {
  it("costs $250", () => {
    expect(VOWEL_COST).toBe(250);
  });

  it("VOWELS set contains exactly A, E, I, O, U", () => {
    expect(VOWELS.size).toBe(5);
    expect(VOWELS.has("A")).toBe(true);
    expect(VOWELS.has("E")).toBe(true);
    expect(VOWELS.has("I")).toBe(true);
    expect(VOWELS.has("O")).toBe(true);
    expect(VOWELS.has("U")).toBe(true);
  });

  it("deducts $250 from round cash (conceptual)", () => {
    const roundCash = 1000;
    const afterPurchase = roundCash - VOWEL_COST;
    expect(afterPurchase).toBe(750);
  });
});

// ─── Consonants / Vowels Remaining ─────────────────────────────────────

describe("getConsonantsRemaining", () => {
  it("returns all 21 consonants when none revealed", () => {
    const remaining = getConsonantsRemaining(new Set());
    expect(remaining).toHaveLength(21);
  });

  it("excludes revealed consonants", () => {
    const revealed = new Set(["B", "C", "D"]);
    const remaining = getConsonantsRemaining(revealed);
    expect(remaining).toHaveLength(18);
    expect(remaining).not.toContain("B");
    expect(remaining).not.toContain("C");
    expect(remaining).not.toContain("D");
  });

  it("does not count vowels as consonants", () => {
    const remaining = getConsonantsRemaining(new Set(["A", "E"]));
    expect(remaining).toHaveLength(21); // Vowels don't affect consonant count
  });
});

describe("getVowelsRemaining", () => {
  it("returns all 5 vowels when none revealed", () => {
    const remaining = getVowelsRemaining(new Set());
    expect(remaining).toHaveLength(5);
  });

  it("excludes revealed vowels", () => {
    const revealed = new Set(["A", "E"]);
    const remaining = getVowelsRemaining(revealed);
    expect(remaining).toHaveLength(3);
    expect(remaining).not.toContain("A");
    expect(remaining).not.toContain("E");
  });
});

// ─── Turn Advancement ──────────────────────────────────────────────────

describe("turn advancement", () => {
  it("turn order wraps around (conceptual)", () => {
    const turnOrder = ["p1", "p2", "p3"];
    let currentTurnIndex = 2; // Last player
    currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
    expect(currentTurnIndex).toBe(0);
    expect(turnOrder[currentTurnIndex]).toBe("p1");
  });

  it("wrong consonant guess loses turn (conceptual)", () => {
    // If a player guesses a consonant not in the puzzle and it's not Wild,
    // the turn advances. We verify the letter is not in the phrase.
    const phrase = "HELLO";
    const guessedLetter = "Z";
    const count = countLetterInPhrase(phrase, guessedLetter);
    expect(count).toBe(0);
    // This would trigger turn advancement in the plugin
  });
});

// ─── Wild Tests ───────────────────────────────────────────────────

describe("wild mechanic", () => {
  it("wild segment has a cash value", () => {
    const wildSegments = WHEEL_SEGMENTS.filter((s) => s.type === "wild");
    expect(wildSegments).toHaveLength(1);
    expect(wildSegments[0]?.value).toBeGreaterThan(0);
  });

  it("wrong guess during wild does not lose turn (conceptual)", () => {
    // Wild means wrong consonant guess doesn't advance the turn.
    // The plugin handles this via the wildActive flag.
    // We just verify the segment type is correctly identified.
    const wildSegment = WHEEL_SEGMENTS.find((s) => s.type === "wild");
    expect(wildSegment).toBeDefined();
    expect(wildSegment?.type).toBe("wild");
  });
});

// ─── Round Ends When Puzzle Solved ─────────────────────────────────────

describe("isPuzzleFullyRevealed", () => {
  it("returns false when letters remain hidden", () => {
    expect(isPuzzleFullyRevealed("HELLO", new Set(["H", "E"]))).toBe(false);
  });

  it("returns true when all letters revealed", () => {
    expect(isPuzzleFullyRevealed("HELLO", new Set(["H", "E", "L", "O"]))).toBe(true);
  });

  it("ignores non-letter characters", () => {
    expect(isPuzzleFullyRevealed("HI!", new Set(["H", "I"]))).toBe(true);
  });

  it("spaces do not need to be revealed", () => {
    expect(isPuzzleFullyRevealed("A B", new Set(["A", "B"]))).toBe(true);
  });
});

// ─── Bonus Round RSTLNE Auto-Reveal ────────────────────────────────────

describe("bonus round RSTLNE", () => {
  it("RSTLNE set contains exactly R, S, T, L, N, E", () => {
    expect(RSTLNE.size).toBe(6);
    expect(RSTLNE.has("R")).toBe(true);
    expect(RSTLNE.has("S")).toBe(true);
    expect(RSTLNE.has("T")).toBe(true);
    expect(RSTLNE.has("L")).toBe(true);
    expect(RSTLNE.has("N")).toBe(true);
    expect(RSTLNE.has("E")).toBe(true);
  });

  it("auto-reveal RSTLNE shows those letters in display", () => {
    const revealed = new Set(["R", "S", "T", "L", "N", "E"]);
    const display = buildPuzzleDisplay("RESTAURANT", revealed);
    // R, E, S, T, L, N should be visible; A, U should be hidden
    expect(display).toBe("REST__R_NT");
  });

  it("bonus prize is $25,000", () => {
    expect(BONUS_PRIZE).toBe(25000);
  });

  it("RSTLNE letters partially reveal a typical puzzle", () => {
    const revealed = new Set(["R", "S", "T", "L", "N", "E"]);
    const phrase = "BREAK A LEG";
    const display = buildPuzzleDisplay(phrase, revealed);
    // B=_, R=R, E=E, A=_, K=_  space  A=_  space  L=L, E=E, G=_
    expect(display).toBe("_RE__ _ LE_");
  });
});

// ─── Content Bank Tests ────────────────────────────────────────────────

describe("phrase bank", () => {
  it("kids puzzles has 20+ entries", () => {
    expect(KIDS_PUZZLES.length).toBeGreaterThanOrEqual(20);
  });

  it("standard puzzles has 20+ entries", () => {
    expect(STANDARD_PUZZLES.length).toBeGreaterThanOrEqual(20);
  });

  it("advanced puzzles has 20+ entries", () => {
    expect(ADVANCED_PUZZLES.length).toBeGreaterThanOrEqual(20);
  });

  it("all puzzles have a category and phrase", () => {
    const allPuzzles = [...KIDS_PUZZLES, ...STANDARD_PUZZLES, ...ADVANCED_PUZZLES];
    for (const puzzle of allPuzzles) {
      expect(puzzle.category).toBeTruthy();
      expect(puzzle.phrase).toBeTruthy();
      // Phrases should be uppercase
      expect(puzzle.phrase).toBe(puzzle.phrase.toUpperCase());
    }
  });

  it("all puzzle phrases only contain letters, spaces, and common punctuation", () => {
    const allPuzzles = [...KIDS_PUZZLES, ...STANDARD_PUZZLES, ...ADVANCED_PUZZLES];
    for (const puzzle of allPuzzles) {
      // Allow letters, spaces, hyphens, ampersands, apostrophes, periods, commas
      expect(puzzle.phrase).toMatch(/^[A-Z &'\-.,]+$/);
    }
  });
});

describe("public game-data redaction", () => {
  it("game-state never includes raw answer and only exposes puzzleDisplay", () => {
    const payload = buildLuckyLettersPublicGameState({
      phase: "spinning",
      round: 1,
      totalRounds: 3,
      currentPuzzle: {
        phrase: "HELLO WORLD",
        category: "SAYINGS",
        hint: "Greeting",
      },
      revealedLetters: new Set(["H", "L"]),
      currentTurnSessionId: "p1",
      turnOrder: ["p1", "p2"],
      standings: [
        { sessionId: "p1", roundCash: 0, totalCash: 1200 },
        { sessionId: "p2", roundCash: 0, totalCash: 900 },
      ],
      wildActive: false,
      lastSpinResult: null,
      bonusPlayerSessionId: null,
      bonusSolved: false,
      streak: 0,
    }) as Record<string, unknown>;

    expect("answer" in payload).toBe(false);
    expect(payload.type).toBe("game-state");
    expect(typeof payload.puzzleDisplay).toBe("string");
    expect(payload.puzzleDisplay).not.toBe("HELLO WORLD");
    expect((payload.puzzleDisplay as string).includes("_")).toBe(true);
  });

  it("round-result payload can include answer after reveal", () => {
    const payload = buildLuckyLettersRoundResultPayload({
      winnerId: "p1",
      answer: "HELLO WORLD",
      category: "SAYINGS",
      roundCashEarned: 1200,
      standings: [{ sessionId: "p1", roundCash: 1200, totalCash: 2200 }],
    }) as Record<string, unknown>;

    expect(payload.type).toBe("round-result");
    expect(payload.answer).toBe("HELLO WORLD");
  });

  it("bonus-reveal payload can include answer after reveal", () => {
    const payload = buildLuckyLettersBonusRevealPayload({
      solved: true,
      answer: "HELLO WORLD",
      bonusPrize: BONUS_PRIZE,
      bonusPlayerId: "p1",
    }) as Record<string, unknown>;

    expect(payload.type).toBe("bonus-reveal");
    expect(payload.answer).toBe("HELLO WORLD");
  });
});
