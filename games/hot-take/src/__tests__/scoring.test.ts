import { calculateLoneWolfScores, calculateMajorityScores } from "../scoring";
import { getRoundType, validateSliderVote } from "../state";

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
});

describe("hot-take/scoring", () => {
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
});
