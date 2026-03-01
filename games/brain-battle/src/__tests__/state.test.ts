import type { GeneratedBoard } from "@flimflam/shared";
import { describe, expect, it } from "vitest";
import {
  APPEALS_PER_PLAYER,
  MAX_TOPICS_PER_PLAYER,
  TOPIC_MAX_LENGTH,
  assignClueIds,
  createBrainBattleInternalState,
  findBuzzWinner,
  fuzzyMatch,
  getClueById,
  isBoardComplete,
  normalizeAnswer,
  stringSimilarity,
  validateTopicSubmission,
} from "../state";

function makeBoard(): GeneratedBoard {
  const categories = [];
  for (let c = 0; c < 5; c++) {
    const clues = [];
    for (let cl = 0; cl < 5; cl++) {
      clues.push({
        id: "",
        answer: `Answer ${c}-${cl}`,
        question: `Question ${c}-${cl}`,
        value: (cl + 1) * 200,
      });
    }
    categories.push({ name: `Category ${c}`, clues });
  }
  return { categories };
}

describe("createBrainBattleInternalState", () => {
  it("should return correct defaults for kids complexity", () => {
    const state = createBrainBattleInternalState("kids");
    expect(state.complexity).toBe("kids");
    expect(state.topics).toEqual([]);
    expect(state.topicSubmissions).toBeInstanceOf(Map);
    expect(state.topicSubmissions.size).toBe(0);
    expect(state.board).toBeNull();
    expect(state.answeredClues).toBeInstanceOf(Set);
    expect(state.answeredClues.size).toBe(0);
    expect(state.cluesRemaining).toBe(25);
    expect(state.currentClueId).toBeNull();
    expect(state.currentClue).toBeNull();
    expect(state.selectorSessionId).toBe("");
    expect(state.buzzTimestamps).toBeInstanceOf(Map);
    expect(state.buzzWinnerId).toBeNull();
    expect(state.lastCorrectAnswerer).toBeNull();
    expect(state.appealsRemaining).toBeInstanceOf(Map);
    expect(state.currentAppeal).toBeNull();
    expect(state.turnOrder).toEqual([]);
    expect(state.wrongAnswerSessionId).toBeNull();
    expect(state.currentClueValue).toBe(0);
  });

  it("should accept standard complexity", () => {
    const state = createBrainBattleInternalState("standard");
    expect(state.complexity).toBe("standard");
  });

  it("should accept advanced complexity", () => {
    const state = createBrainBattleInternalState("advanced");
    expect(state.complexity).toBe("advanced");
  });
});

describe("validateTopicSubmission", () => {
  it("should accept a single valid topic", () => {
    const result = validateTopicSubmission(["Science"]);
    expect(result.valid).toBe(true);
    expect(result.value).toEqual(["Science"]);
  });

  it("should accept 3 valid topics", () => {
    const result = validateTopicSubmission(["Science", "History", "Music"]);
    expect(result.valid).toBe(true);
    expect(result.value).toEqual(["Science", "History", "Music"]);
  });

  it("should trim whitespace from topics", () => {
    const result = validateTopicSubmission(["  Science  ", " History "]);
    expect(result.valid).toBe(true);
    expect(result.value).toEqual(["Science", "History"]);
  });

  it("should reject empty array", () => {
    const result = validateTopicSubmission([]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("at least 1");
  });

  it("should reject more than 3 topics", () => {
    const result = validateTopicSubmission(["a", "b", "c", "d"]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_TOPICS_PER_PLAYER}`);
  });

  it("should reject non-array input", () => {
    const result = validateTopicSubmission("not an array");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("array");
  });

  it("should reject non-string items", () => {
    const result = validateTopicSubmission([42]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("string");
  });

  it("should reject topics that are too long", () => {
    const long = "x".repeat(TOPIC_MAX_LENGTH + 1);
    const result = validateTopicSubmission([long]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${TOPIC_MAX_LENGTH}`);
  });

  it("should reject empty string topics (after trim)", () => {
    const result = validateTopicSubmission(["   "]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("should reject null input", () => {
    const result = validateTopicSubmission(null);
    expect(result.valid).toBe(false);
  });

  it("should reject undefined input", () => {
    const result = validateTopicSubmission(undefined);
    expect(result.valid).toBe(false);
  });
});

describe("findBuzzWinner", () => {
  it("should return the only buzzer for a single entry", () => {
    const map = new Map([["player1", 1000]]);
    expect(findBuzzWinner(map)).toBe("player1");
  });

  it("should return the earliest buzzer among multiple", () => {
    const map = new Map([
      ["player1", 1050],
      ["player2", 1010],
      ["player3", 1030],
    ]);
    expect(findBuzzWinner(map)).toBe("player2");
  });

  it("should return null for an empty map", () => {
    const map = new Map<string, number>();
    expect(findBuzzWinner(map)).toBeNull();
  });

  it("should handle ties by returning the first encountered", () => {
    const map = new Map([
      ["player1", 1000],
      ["player2", 1000],
    ]);
    const winner = findBuzzWinner(map);
    expect(winner).toBe("player1");
  });
});

describe("normalizeAnswer", () => {
  it("should lowercase the input", () => {
    expect(normalizeAnswer("HELLO")).toBe("hello");
  });

  it("should strip 'what is' prefix", () => {
    expect(normalizeAnswer("What is gravity")).toBe("gravity");
  });

  it("should strip 'who is' prefix", () => {
    expect(normalizeAnswer("Who is Einstein")).toBe("einstein");
  });

  it("should strip 'where is' prefix", () => {
    expect(normalizeAnswer("Where is Paris")).toBe("paris");
  });

  it("should strip 'what are' prefix", () => {
    expect(normalizeAnswer("What are electrons")).toBe("electrons");
  });

  it("should strip prefix with articles (a/an/the)", () => {
    expect(normalizeAnswer("What is a banana")).toBe("banana");
    expect(normalizeAnswer("What is an apple")).toBe("apple");
    expect(normalizeAnswer("What is the sun")).toBe("sun");
  });

  it("should remove punctuation except apostrophes", () => {
    expect(normalizeAnswer("it's great!")).toBe("it's great");
    expect(normalizeAnswer("hello, world.")).toBe("hello world");
  });

  it("should collapse multiple spaces", () => {
    expect(normalizeAnswer("too   many    spaces")).toBe("too many spaces");
  });

  it("should trim whitespace", () => {
    expect(normalizeAnswer("  hello  ")).toBe("hello");
  });

  it("should handle combined normalizations", () => {
    expect(normalizeAnswer("  What is  the   Moon?!  ")).toBe("moon");
  });
});

describe("stringSimilarity", () => {
  it("should return 1 for identical strings", () => {
    expect(stringSimilarity("hello", "hello")).toBe(1);
  });

  it("should return 0 for completely different strings of equal length", () => {
    // "abc" vs "xyz" => distance 3, maxLen 3 => 1 - 3/3 = 0
    expect(stringSimilarity("abc", "xyz")).toBe(0);
  });

  it("should return a high value for close strings", () => {
    // "kitten" vs "sitten" => distance 1, maxLen 6 => 1 - 1/6 ≈ 0.833
    const sim = stringSimilarity("kitten", "sitten");
    expect(sim).toBeGreaterThan(0.8);
    expect(sim).toBeLessThan(0.9);
  });

  it("should return 1 for two empty strings", () => {
    expect(stringSimilarity("", "")).toBe(1);
  });

  it("should handle one empty string", () => {
    expect(stringSimilarity("", "hello")).toBe(0);
    expect(stringSimilarity("hello", "")).toBe(0);
  });
});

describe("fuzzyMatch", () => {
  it("should match exact answers", () => {
    expect(fuzzyMatch("gravity", "gravity")).toBe(true);
  });

  it("should match case-insensitively", () => {
    expect(fuzzyMatch("GRAVITY", "gravity")).toBe(true);
  });

  it("should match after prefix stripping", () => {
    expect(fuzzyMatch("What is gravity", "gravity")).toBe(true);
  });

  it("should match with minor typos (high similarity)", () => {
    // "gravitty" vs "gravity" => normalized: "gravitty" vs "gravity"
    // distance 1, maxLen 8 => similarity = 0.875 >= 0.85
    expect(fuzzyMatch("gravitty", "gravity")).toBe(true);
  });

  it("should match when one contains the other (partial match)", () => {
    expect(fuzzyMatch("the great wall", "the great wall of china")).toBe(true);
    expect(fuzzyMatch("the great wall of china", "the great wall")).toBe(true);
  });

  it("should not match completely different answers", () => {
    expect(fuzzyMatch("banana", "quantum physics")).toBe(false);
  });

  it("should not match moderately different answers", () => {
    expect(fuzzyMatch("cat", "dog")).toBe(false);
  });

  it("should handle prefix-stripped comparison", () => {
    expect(fuzzyMatch("Who is Einstein", "What is Einstein")).toBe(true);
  });
});

describe("getClueById", () => {
  const board = makeBoard();

  it("should return clue for valid id cat0_clue0", () => {
    const clue = getClueById(board, "cat0_clue0");
    expect(clue).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: test assertion after null check
    expect(clue!.answer).toBe("Answer 0-0");
    // biome-ignore lint/style/noNonNullAssertion: test assertion after null check
    expect(clue!.question).toBe("Question 0-0");
  });

  it("should return clue for valid id cat4_clue4", () => {
    const clue = getClueById(board, "cat4_clue4");
    expect(clue).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: test assertion after null check
    expect(clue!.answer).toBe("Answer 4-4");
    // biome-ignore lint/style/noNonNullAssertion: test assertion after null check
    expect(clue!.value).toBe(1000);
  });

  it("should return null for out-of-range category (cat5_clue0)", () => {
    expect(getClueById(board, "cat5_clue0")).toBeNull();
  });

  it("should return null for out-of-range clue (cat0_clue5)", () => {
    expect(getClueById(board, "cat0_clue5")).toBeNull();
  });

  it("should return null for invalid format", () => {
    expect(getClueById(board, "foo")).toBeNull();
    expect(getClueById(board, "cat_clue")).toBeNull();
    expect(getClueById(board, "")).toBeNull();
  });

  it("should return null for negative indices", () => {
    expect(getClueById(board, "cat-1_clue0")).toBeNull();
  });
});

describe("isBoardComplete", () => {
  it("should return false when no clues answered", () => {
    expect(isBoardComplete(new Set(), 25)).toBe(false);
  });

  it("should return false when 24 of 25 answered", () => {
    const answered = new Set<string>();
    for (let i = 0; i < 24; i++) {
      answered.add(`clue_${i}`);
    }
    expect(isBoardComplete(answered, 25)).toBe(false);
  });

  it("should return true when 25 of 25 answered", () => {
    const answered = new Set<string>();
    for (let i = 0; i < 25; i++) {
      answered.add(`clue_${i}`);
    }
    expect(isBoardComplete(answered, 25)).toBe(true);
  });

  it("should return true when more than total answered", () => {
    const answered = new Set<string>();
    for (let i = 0; i < 30; i++) {
      answered.add(`clue_${i}`);
    }
    expect(isBoardComplete(answered, 25)).toBe(true);
  });
});

describe("assignClueIds", () => {
  it("should assign correct IDs to all 25 clues", () => {
    const board = makeBoard();
    const result = assignClueIds(board);

    for (let c = 0; c < 5; c++) {
      for (let cl = 0; cl < 5; cl++) {
        expect(result.categories[c]?.clues[cl]?.id).toBe(`cat${c}_clue${cl}`);
      }
    }
  });

  it("should return the same board reference (mutates in place)", () => {
    const board = makeBoard();
    const result = assignClueIds(board);
    expect(result).toBe(board);
  });

  it("should produce IDs that getClueById can resolve", () => {
    const board = assignClueIds(makeBoard());
    for (let c = 0; c < 5; c++) {
      for (let cl = 0; cl < 5; cl++) {
        const id = `cat${c}_clue${cl}`;
        const clue = getClueById(board, id);
        expect(clue).not.toBeNull();
        // biome-ignore lint/style/noNonNullAssertion: test assertion after null check
        expect(clue!.id).toBe(id);
      }
    }
  });
});

describe("constants", () => {
  it("TOPIC_MAX_LENGTH should be 40", () => {
    expect(TOPIC_MAX_LENGTH).toBe(40);
  });

  it("MAX_TOPICS_PER_PLAYER should be 3", () => {
    expect(MAX_TOPICS_PER_PLAYER).toBe(3);
  });

  it("APPEALS_PER_PLAYER should be 2", () => {
    expect(APPEALS_PER_PLAYER).toBe(2);
  });
});
