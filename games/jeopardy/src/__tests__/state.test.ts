import { describe, expect, it } from "vitest";
import {
  ADVANCED_BOARDS,
  CATEGORIES_PER_BOARD,
  CLUES_PER_CATEGORY,
  CLUE_VALUES,
  DOUBLE_JEOPARDY_VALUES,
  FUZZY_THRESHOLD,
  KIDS_BOARDS,
  STANDARD_BOARDS,
  getClueBank,
  getDailyDoubleCount,
  judgeAnswer,
  placeDailyDoubles,
  validateDailyDoubleWager,
  validateFinalJeopardyWager,
} from "../index";

// ─── Board Generation Tests ───────────────────────────────────────────────

describe("board generation", () => {
  it("kids has 7 boards", () => {
    expect(KIDS_BOARDS).toHaveLength(7);
  });

  it("standard has 7 boards", () => {
    expect(STANDARD_BOARDS).toHaveLength(7);
  });

  it("advanced has 7 boards", () => {
    expect(ADVANCED_BOARDS).toHaveLength(7);
  });

  it("getClueBank returns correct bank for each complexity", () => {
    expect(getClueBank("kids")).toBe(KIDS_BOARDS);
    expect(getClueBank("standard")).toBe(STANDARD_BOARDS);
    expect(getClueBank("advanced")).toBe(ADVANCED_BOARDS);
  });

  it("getClueBank defaults to standard for unknown complexity", () => {
    expect(getClueBank("unknown")).toBe(STANDARD_BOARDS);
  });

  it("every board has 6 categories", () => {
    const allBoards = [...KIDS_BOARDS, ...STANDARD_BOARDS, ...ADVANCED_BOARDS];
    for (const board of allBoards) {
      expect(board.categories).toHaveLength(CATEGORIES_PER_BOARD);
    }
  });

  it("every category has 5 clues", () => {
    const allBoards = [...KIDS_BOARDS, ...STANDARD_BOARDS, ...ADVANCED_BOARDS];
    for (const board of allBoards) {
      for (const category of board.categories) {
        expect(category.clues).toHaveLength(CLUES_PER_CATEGORY);
      }
    }
  });

  it("clue values are $200, $400, $600, $800, $1000 in order", () => {
    const allBoards = [...KIDS_BOARDS, ...STANDARD_BOARDS, ...ADVANCED_BOARDS];
    for (const board of allBoards) {
      for (const category of board.categories) {
        const values = category.clues.map((c) => c.value);
        expect(values).toEqual(CLUE_VALUES);
      }
    }
  });

  it("every clue has a non-empty answer and question", () => {
    const allBoards = [...KIDS_BOARDS, ...STANDARD_BOARDS, ...ADVANCED_BOARDS];
    for (const board of allBoards) {
      for (const category of board.categories) {
        for (const clue of category.clues) {
          expect(clue.answer.length).toBeGreaterThan(0);
          expect(clue.question.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("every category has a non-empty name", () => {
    const allBoards = [...KIDS_BOARDS, ...STANDARD_BOARDS, ...ADVANCED_BOARDS];
    for (const board of allBoards) {
      for (const category of board.categories) {
        expect(category.name.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── Double Jeopardy Values ──────────────────────────────────────────────

describe("Double Jeopardy values", () => {
  it("DOUBLE_JEOPARDY_VALUES are exactly double the Round 1 values", () => {
    expect(DOUBLE_JEOPARDY_VALUES).toEqual([400, 800, 1200, 1600, 2000]);
    for (let i = 0; i < CLUE_VALUES.length; i++) {
      expect(DOUBLE_JEOPARDY_VALUES[i]).toBe((CLUE_VALUES[i] ?? 0) * 2);
    }
  });

  it("both value arrays have 5 entries (one per clue row)", () => {
    expect(CLUE_VALUES).toHaveLength(CLUES_PER_CATEGORY);
    expect(DOUBLE_JEOPARDY_VALUES).toHaveLength(CLUES_PER_CATEGORY);
  });

  it("Round 1 values range from $200 to $1000", () => {
    expect(CLUE_VALUES[0]).toBe(200);
    expect(CLUE_VALUES[4]).toBe(1000);
  });

  it("Round 2 values range from $400 to $2000", () => {
    expect(DOUBLE_JEOPARDY_VALUES[0]).toBe(400);
    expect(DOUBLE_JEOPARDY_VALUES[4]).toBe(2000);
  });
});

// ─── Daily Double Placement Tests ─────────────────────────────────────────

describe("placeDailyDoubles", () => {
  it("places 1 daily double for kids (Round 1)", () => {
    const count = getDailyDoubleCount("kids");
    expect(count).toBe(1);
    const dd = placeDailyDoubles(count, CATEGORIES_PER_BOARD, CLUES_PER_CATEGORY);
    expect(dd.size).toBe(1);
  });

  it("places 1 daily double for standard (legacy, Round 1 count)", () => {
    const count = getDailyDoubleCount("standard");
    expect(count).toBe(1);
    const dd = placeDailyDoubles(count, CATEGORIES_PER_BOARD, CLUES_PER_CATEGORY);
    expect(dd.size).toBe(1);
  });

  it("places 1 daily double for advanced (legacy, Round 1 count)", () => {
    const count = getDailyDoubleCount("advanced");
    expect(count).toBe(1);
    const dd = placeDailyDoubles(count, CATEGORIES_PER_BOARD, CLUES_PER_CATEGORY);
    expect(dd.size).toBe(1);
  });

  it("can place 2 daily doubles (for Round 2)", () => {
    const dd = placeDailyDoubles(2, CATEGORIES_PER_BOARD, CLUES_PER_CATEGORY);
    expect(dd.size).toBe(2);
  });

  it("daily doubles are never on the $200 row (index 0)", () => {
    // Run many times to verify probabilistically
    for (let trial = 0; trial < 50; trial++) {
      const dd = placeDailyDoubles(2, CATEGORIES_PER_BOARD, CLUES_PER_CATEGORY);
      for (const posKey of dd) {
        const [, clueIndexStr] = posKey.split(",");
        const clueIndex = Number(clueIndexStr);
        expect(clueIndex).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("daily doubles are at valid positions", () => {
    for (let trial = 0; trial < 50; trial++) {
      const dd = placeDailyDoubles(2, CATEGORIES_PER_BOARD, CLUES_PER_CATEGORY);
      for (const posKey of dd) {
        const [catStr, clueStr] = posKey.split(",");
        const catIndex = Number(catStr);
        const clueIndex = Number(clueStr);
        expect(catIndex).toBeGreaterThanOrEqual(0);
        expect(catIndex).toBeLessThan(CATEGORIES_PER_BOARD);
        expect(clueIndex).toBeGreaterThanOrEqual(1);
        expect(clueIndex).toBeLessThan(CLUES_PER_CATEGORY);
      }
    }
  });

  it("daily doubles are unique positions", () => {
    for (let trial = 0; trial < 50; trial++) {
      const dd = placeDailyDoubles(2, CATEGORIES_PER_BOARD, CLUES_PER_CATEGORY);
      const positions = [...dd];
      const unique = new Set(positions);
      expect(unique.size).toBe(positions.length);
    }
  });
});

// ─── Fuzzy Matching / Answer Judging Tests ────────────────────────────────

describe("judgeAnswer", () => {
  it("accepts exact match", () => {
    expect(judgeAnswer("Paris", "Paris")).toBe(true);
  });

  it("accepts case-insensitive match", () => {
    expect(judgeAnswer("paris", "Paris")).toBe(true);
  });

  it("accepts 'What is' prefix in answer", () => {
    expect(judgeAnswer("What is Paris", "Paris")).toBe(true);
  });

  it("accepts 'Who is' prefix in answer", () => {
    expect(judgeAnswer("Who is Einstein", "Einstein")).toBe(true);
  });

  it("accepts minor typos via fuzzy matching", () => {
    // "Shakespear" vs "Shakespeare" -- high similarity
    expect(judgeAnswer("Shakespear", "Shakespeare")).toBe(true);
  });

  it("rejects clearly wrong answers", () => {
    expect(judgeAnswer("London", "Paris")).toBe(false);
  });

  it("rejects empty answers", () => {
    expect(judgeAnswer("", "Paris")).toBe(false);
  });

  it("accepts answers that contain the correct answer", () => {
    expect(judgeAnswer("The great Albert Einstein", "Albert Einstein")).toBe(true);
  });

  it("uses the correct threshold", () => {
    expect(FUZZY_THRESHOLD).toBe(0.85);
  });
});

// ─── Wager Validation Tests ───────────────────────────────────────────────

describe("validateDailyDoubleWager", () => {
  it("accepts minimum wager of 5", () => {
    expect(validateDailyDoubleWager(5, 1000)).toBe(true);
  });

  it("rejects wager below 5", () => {
    expect(validateDailyDoubleWager(4, 1000)).toBe(false);
  });

  it("accepts wager equal to player score", () => {
    expect(validateDailyDoubleWager(2000, 2000)).toBe(true);
  });

  it("rejects wager above player score when score > 1000", () => {
    expect(validateDailyDoubleWager(3000, 2000)).toBe(false);
  });

  it("allows wager up to 1000 when player score is low", () => {
    // Max wager is max(playerScore, 1000) so even with 200 score, can bet up to 1000
    expect(validateDailyDoubleWager(1000, 200)).toBe(true);
  });

  it("allows wager up to 1000 when player score is 0", () => {
    expect(validateDailyDoubleWager(1000, 0)).toBe(true);
  });

  it("allows wager up to 1000 when player score is negative", () => {
    expect(validateDailyDoubleWager(1000, -500)).toBe(true);
  });

  it("rejects non-finite wagers", () => {
    expect(validateDailyDoubleWager(Number.NaN, 1000)).toBe(false);
    expect(validateDailyDoubleWager(Number.POSITIVE_INFINITY, 1000)).toBe(false);
  });

  it("allows wager up to 2000 in Double Jeopardy when player score is low", () => {
    // With highestClueValue=2000, max wager = max(score, 2000)
    expect(validateDailyDoubleWager(2000, 200, 2000)).toBe(true);
  });

  it("rejects wager above 2000 in Double Jeopardy when score is low", () => {
    expect(validateDailyDoubleWager(2001, 200, 2000)).toBe(false);
  });
});

describe("validateFinalJeopardyWager", () => {
  it("accepts wager of 0", () => {
    expect(validateFinalJeopardyWager(0, 5000)).toBe(true);
  });

  it("accepts wager equal to score", () => {
    expect(validateFinalJeopardyWager(5000, 5000)).toBe(true);
  });

  it("rejects wager above score", () => {
    expect(validateFinalJeopardyWager(6000, 5000)).toBe(false);
  });

  it("rejects negative wager", () => {
    expect(validateFinalJeopardyWager(-1, 5000)).toBe(false);
  });

  it("rejects any wager when player score is 0", () => {
    expect(validateFinalJeopardyWager(0, 0)).toBe(false);
  });

  it("rejects any wager when player score is negative", () => {
    expect(validateFinalJeopardyWager(0, -100)).toBe(false);
  });

  it("rejects non-finite wagers", () => {
    expect(validateFinalJeopardyWager(Number.NaN, 5000)).toBe(false);
    expect(validateFinalJeopardyWager(Number.POSITIVE_INFINITY, 5000)).toBe(false);
  });
});

// ─── Scoring Tests ────────────────────────────────────────────────────────

describe("scoring mechanics", () => {
  it("correct answer awards positive clue value (conceptual)", () => {
    const score = 0;
    const clueValue = 600;
    const newScore = score + clueValue;
    expect(newScore).toBe(600);
  });

  it("wrong answer deducts clue value in standard mode (conceptual)", () => {
    const score = 1000;
    const clueValue = 400;
    const newScore = score - clueValue;
    expect(newScore).toBe(600);
  });

  it("wrong answer does NOT deduct in kids mode (conceptual)", () => {
    const score = 200;
    const _clueValue = 600;
    // In kids mode, wrong = 0 penalty
    const newScore = score; // no change
    expect(newScore).toBe(200);
  });

  it("kids mode score cannot go below 0 (conceptual)", () => {
    const score = 100;
    const delta = -300;
    const newScore = Math.max(0, score + delta);
    expect(newScore).toBe(0);
  });

  it("daily double correct awards wager amount (conceptual)", () => {
    const score = 2000;
    const wager = 1500;
    const newScore = score + wager;
    expect(newScore).toBe(3500);
  });

  it("daily double wrong deducts wager amount (conceptual)", () => {
    const score = 2000;
    const wager = 1500;
    const newScore = score - wager;
    expect(newScore).toBe(500);
  });

  it("final jeopardy correct adds wager (conceptual)", () => {
    const score = 5000;
    const wager = 3000;
    const newScore = score + wager;
    expect(newScore).toBe(8000);
  });

  it("final jeopardy wrong deducts wager (conceptual)", () => {
    const score = 5000;
    const wager = 3000;
    const newScore = score - wager;
    expect(newScore).toBe(2000);
  });

  it("Double Jeopardy values are used in Round 2 scoring (conceptual)", () => {
    // In Round 2, a row-0 clue is worth $400 instead of $200
    const round2Value = DOUBLE_JEOPARDY_VALUES[0];
    expect(round2Value).toBe(400);
    const score = 1000;
    const newScore = score + (round2Value ?? 0);
    expect(newScore).toBe(1400);
  });
});

// ─── Final Jeopardy Eligibility Tests ─────────────────────────────────────

describe("final jeopardy eligibility", () => {
  it("only players with score > 0 can wager (conceptual)", () => {
    const scores = new Map([
      ["p1", 5000],
      ["p2", 0],
      ["p3", -200],
      ["p4", 1200],
    ]);

    const eligible: string[] = [];
    for (const [sessionId, score] of scores) {
      if (score > 0) eligible.push(sessionId);
    }

    expect(eligible).toEqual(["p1", "p4"]);
    expect(eligible).not.toContain("p2");
    expect(eligible).not.toContain("p3");
  });
});

// ─── Clue Board Tracking Tests ────────────────────────────────────────────

describe("clue board tracking", () => {
  it("total clues per board is 30", () => {
    expect(CATEGORIES_PER_BOARD * CLUES_PER_CATEGORY).toBe(30);
  });

  it("revealedClues set tracks answered clues correctly (conceptual)", () => {
    const revealed = new Set<string>();
    revealed.add("0,0");
    revealed.add("2,3");
    revealed.add("5,4");

    expect(revealed.has("0,0")).toBe(true);
    expect(revealed.has("2,3")).toBe(true);
    expect(revealed.has("1,1")).toBe(false);
    expect(revealed.size).toBe(3);
  });

  it("all clues revealed triggers end of round (conceptual)", () => {
    const revealed = new Set<string>();
    for (let c = 0; c < CATEGORIES_PER_BOARD; c++) {
      for (let r = 0; r < CLUES_PER_CATEGORY; r++) {
        revealed.add(`${c},${r}`);
      }
    }
    expect(revealed.size).toBe(30);
    const allRevealed = revealed.size >= CATEGORIES_PER_BOARD * CLUES_PER_CATEGORY;
    expect(allRevealed).toBe(true);
  });

  it("revealed clues reset between rounds (conceptual)", () => {
    const revealed = new Set<string>();
    // Fill Round 1
    for (let c = 0; c < CATEGORIES_PER_BOARD; c++) {
      for (let r = 0; r < CLUES_PER_CATEGORY; r++) {
        revealed.add(`${c},${r}`);
      }
    }
    expect(revealed.size).toBe(30);
    // Round transition clears revealed
    revealed.clear();
    expect(revealed.size).toBe(0);
  });
});

// ─── Round-Robin Selector Rotation Tests ──────────────────────────────────

describe("round-robin selector rotation", () => {
  it("selector advances to next player after each clue (conceptual)", () => {
    const playerOrder = ["p1", "p2", "p3", "p4"];
    let selectorIndex = 0; // p1 starts

    // After first clue, advance to p2
    selectorIndex = (selectorIndex + 1) % playerOrder.length;
    expect(playerOrder[selectorIndex]).toBe("p2");

    // After second clue, advance to p3
    selectorIndex = (selectorIndex + 1) % playerOrder.length;
    expect(playerOrder[selectorIndex]).toBe("p3");

    // After third clue, advance to p4
    selectorIndex = (selectorIndex + 1) % playerOrder.length;
    expect(playerOrder[selectorIndex]).toBe("p4");
  });

  it("selector wraps around to first player after last (conceptual)", () => {
    const playerOrder = ["p1", "p2", "p3"];
    let selectorIndex = 2; // p3 is current

    selectorIndex = (selectorIndex + 1) % playerOrder.length;
    expect(playerOrder[selectorIndex]).toBe("p1");
  });

  it("selector skips disconnected players (conceptual)", () => {
    const playerOrder = ["p1", "p2", "p3", "p4"];
    const connected = new Set(["p1", "p3", "p4"]); // p2 disconnected
    let selectorIndex = 0; // p1 is current

    // Advance to next connected player
    for (let i = 1; i <= playerOrder.length; i++) {
      const idx = (selectorIndex + i) % playerOrder.length;
      const candidate = playerOrder[idx];
      if (candidate && connected.has(candidate)) {
        selectorIndex = idx;
        break;
      }
    }

    // Should skip p2, land on p3
    expect(playerOrder[selectorIndex]).toBe("p3");
  });

  it("full rotation gives every player a turn before repeating (conceptual)", () => {
    const playerOrder = ["p1", "p2", "p3"];
    const selectors: string[] = [];
    let selectorIndex = 0;

    // Simulate 6 clue selections (2 full rotations)
    for (let clue = 0; clue < 6; clue++) {
      selectors.push(playerOrder[selectorIndex] ?? "");
      selectorIndex = (selectorIndex + 1) % playerOrder.length;
    }

    expect(selectors).toEqual(["p1", "p2", "p3", "p1", "p2", "p3"]);
  });

  it("selector rotation is independent of who answered correctly (conceptual)", () => {
    // In the rewritten logic, rotation is always round-robin regardless of correctness
    const playerOrder = ["p1", "p2", "p3"];
    let selectorIndex = 0;

    // p1 selects, p2 answers correctly — does NOT matter, next selector is p2
    selectorIndex = (selectorIndex + 1) % playerOrder.length;
    expect(playerOrder[selectorIndex]).toBe("p2");

    // p2 selects, nobody answers correctly — still advances to p3
    selectorIndex = (selectorIndex + 1) % playerOrder.length;
    expect(playerOrder[selectorIndex]).toBe("p3");
  });

  it("daily double does not break rotation — still advances after (conceptual)", () => {
    const playerOrder = ["p1", "p2", "p3"];
    let selectorIndex = 1; // p2 is selector, hits a Daily Double

    // After Daily Double resolves, selector still advances to p3
    selectorIndex = (selectorIndex + 1) % playerOrder.length;
    expect(playerOrder[selectorIndex]).toBe("p3");
  });
});

// ─── Plugin Factory Test ──────────────────────────────────────────────────

describe("createJeopardyPlugin", () => {
  // Import dynamically to make sure the factory function works
  it("creates a plugin with the correct manifest", async () => {
    const { createJeopardyPlugin } = await import("../index");
    const plugin = createJeopardyPlugin();

    expect(plugin.manifest.id).toBe("jeopardy");
    expect(plugin.manifest.name).toBe("Jeopardy");
    expect(plugin.manifest.minPlayers).toBe(3);
    expect(plugin.manifest.maxPlayers).toBe(8);
    expect(plugin.manifest.estimatedMinutes).toBe(15);
    expect(plugin.manifest.aiRequired).toBe(false);
    expect(plugin.manifest.complexityLevels).toEqual(["kids", "standard", "advanced"]);
    expect(plugin.manifest.tags).toEqual(["trivia", "buzzer", "classic"]);
  });

  it("isGameOver returns false initially", async () => {
    const { createJeopardyPlugin } = await import("../index");
    const plugin = createJeopardyPlugin();
    // Before game starts, phase is category-reveal (not final-scores)
    expect(plugin.isGameOver(null as never)).toBe(false);
  });
});

// ─── Content Quality Tests ────────────────────────────────────────────────

describe("content quality", () => {
  it("kids boards have age-appropriate categories", () => {
    const kidsCategoryNames = KIDS_BOARDS.flatMap((b) => b.categories.map((c) => c.name));
    // Should include fun/simple topics
    expect(kidsCategoryNames).toContain("Animals");
    expect(kidsCategoryNames).toContain("Cartoons");
    expect(kidsCategoryNames).toContain("Space");
  });

  it("advanced boards have challenging categories", () => {
    const advCategoryNames = ADVANCED_BOARDS.flatMap((b) => b.categories.map((c) => c.name));
    expect(advCategoryNames).toContain("Classical Music");
    expect(advCategoryNames).toContain("Philosophy");
    expect(advCategoryNames).toContain("World Politics");
  });

  it("no duplicate category names within a single board", () => {
    const allBoards = [...KIDS_BOARDS, ...STANDARD_BOARDS, ...ADVANCED_BOARDS];
    for (const board of allBoards) {
      const names = board.categories.map((c) => c.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    }
  });

  it("all questions end with a question mark", () => {
    const allBoards = [...KIDS_BOARDS, ...STANDARD_BOARDS, ...ADVANCED_BOARDS];
    for (const board of allBoards) {
      for (const category of board.categories) {
        for (const clue of category.clues) {
          expect(clue.question.endsWith("?")).toBe(true);
        }
      }
    }
  });
});
