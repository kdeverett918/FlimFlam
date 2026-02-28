import {
  SCORING,
  calculateLoneWolfScores,
  calculateMajorityScores,
  computeMedianVoteValue,
} from "../scoring";
import {
  computeRoundStats,
  getRoundType,
  validateSliderVote,
  validateTopicSubmission,
} from "../state";

describe("hot-take/state", () => {
  it("getRoundType alternates majority/lone-wolf", () => {
    expect(getRoundType(1)).toBe("majority");
    expect(getRoundType(2)).toBe("lone-wolf");
    expect(getRoundType(3)).toBe("majority");
  });

  it("validateSliderVote enforces integer -2..2", () => {
    expect(validateSliderVote(-2).valid).toBe(true);
    expect(validateSliderVote(2).valid).toBe(true);
    expect(validateSliderVote(2.5).valid).toBe(false);
    expect(validateSliderVote(3).valid).toBe(false);
    expect(validateSliderVote("1").valid).toBe(false);
  });

  it("validateTopicSubmission accepts bounded content and optional category", () => {
    const valid = validateTopicSubmission({ content: "remote work norms", category: "workplace" });
    expect(valid.valid).toBe(true);
    expect(valid.value?.content).toBe("remote work norms");
    expect(valid.value?.category).toBe("workplace");

    expect(validateTopicSubmission({ content: "   " }).valid).toBe(false);
    expect(validateTopicSubmission({ content: 123 }).valid).toBe(false);
  });

  it("computeRoundStats flags unanimous vs polarized", () => {
    const unanimousVotes = new Map([
      ["a", 1],
      ["b", 1],
      ["c", 0],
    ]);
    const unanimous = computeRoundStats("test", 1, unanimousVotes);
    expect(unanimous.wasUnanimous).toBe(true);

    const polarizedVotes = new Map([
      ["a", -2],
      ["b", 2],
      ["c", -1],
      ["d", 2],
    ]);
    const polarized = computeRoundStats("test", 2, polarizedVotes);
    expect(polarized.wasPolarized).toBe(true);
  });
});

describe("hot-take/scoring", () => {
  it("computeMedianVoteValue matches majority scoring median", () => {
    expect(computeMedianVoteValue([-2, -1, 2])).toBe(-1);
    expect(computeMedianVoteValue([-2, -1, 1, 2])).toBe(0);
  });

  it("calculateMajorityScores rewards proximity to median", () => {
    const votes = new Map([
      ["a", -2],
      ["b", -1],
      ["c", -1],
      ["d", 2],
    ]);
    const scores = calculateMajorityScores(votes);
    expect(scores.get("b")?.points).toBeGreaterThanOrEqual(scores.get("a")?.points ?? 0);
  });

  it("calculateLoneWolfScores rewards uniqueness", () => {
    const votes = new Map([
      ["a", -2],
      ["b", -2],
      ["c", 2],
      ["d", 0],
    ]);
    const scores = calculateLoneWolfScores(votes);
    expect(scores.get("c")?.points).toBeGreaterThanOrEqual(scores.get("a")?.points ?? 0);
  });

  it("calculateLoneWolfScores awards no lone wolves when everyone ties", () => {
    const votes = new Map([
      ["a", -2],
      ["b", 2],
      ["c", -2],
      ["d", 2],
    ]);
    const scores = calculateLoneWolfScores(votes);
    expect(scores.get("a")?.points).toBe(SCORING.LONE_WOLF_DEFAULT);
    expect(scores.get("b")?.points).toBe(SCORING.LONE_WOLF_DEFAULT);
    expect(scores.get("c")?.points).toBe(SCORING.LONE_WOLF_DEFAULT);
    expect(scores.get("d")?.points).toBe(SCORING.LONE_WOLF_DEFAULT);
  });
});
