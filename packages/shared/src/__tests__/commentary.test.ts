vi.mock("../utils/random", () => ({
  pickRandom: vi.fn(),
}));

import {
  analyzeGameState,
  generateAwards,
  getBlowoutCommentary,
  getCloseGameCommentary,
  getComebackCommentary,
  getCorrectCommentary,
  getLastRoundCommentary,
  getStreakCommentary,
  getWrongCommentary,
} from "../commentary";
import { pickRandom } from "../utils/random";

const mockedPickRandom = vi.mocked(pickRandom);

describe("shared/commentary", () => {
  beforeEach(() => {
    mockedPickRandom.mockReset();
  });

  it("returns streak commentary with name substitution and streak cap", () => {
    mockedPickRandom.mockReturnValue("{name} is on FIRE!");
    expect(getStreakCommentary("Alex", 3)).toBe("Alex is on FIRE!");

    mockedPickRandom.mockReturnValue("{name} is absolutely CRUSHING it!");
    expect(getStreakCommentary("Alex", 10)).toBe("Alex is absolutely CRUSHING it!");

    expect(getStreakCommentary("Alex", 1)).toBeNull();
  });

  it("uses fallbacks when random selection is unavailable", () => {
    mockedPickRandom.mockReturnValue(undefined);

    expect(getComebackCommentary("Kai")).toBe("The comeback is ON!");
    expect(getCloseGameCommentary()).toBe("It's anyone's game!");
    expect(getBlowoutCommentary("Mina")).toBe("Mina is running away with it!");
    expect(getLastRoundCommentary()).toBe("FINAL ROUND — make it count!");
    expect(getCorrectCommentary()).toBe("Correct!");
    expect(getWrongCommentary()).toBe("Wrong!");
  });

  it("analyzes game state for close games, blowouts, and final round", () => {
    mockedPickRandom.mockImplementation((items) => items[0]);

    expect(analyzeGameState([], false)).toBeNull();
    expect(analyzeGameState([{ name: "A", score: 10 }], false)).toBeNull();

    expect(
      analyzeGameState(
        [
          { name: "A", score: 101 },
          { name: "B", score: 100 },
        ],
        false,
      ),
    ).toBe("It's anyone's game!");

    expect(
      analyzeGameState(
        [
          { name: "Leader", score: 200 },
          { name: "Second", score: 90 },
        ],
        false,
      ),
    ).toContain("Leader");

    expect(
      analyzeGameState(
        [
          { name: "A", score: 100 },
          { name: "B", score: 90 },
        ],
        true,
      ),
    ).toBe("FINAL ROUND — make it count!");
  });

  it("generates awards with winner first and game-specific optional awards", () => {
    mockedPickRandom.mockImplementation((items) => items[0]);

    const awards = generateAwards(
      [
        {
          name: "Winner",
          sessionId: "w",
          score: 1000,
          correctCount: 4,
          fastestAnswer: 900,
          comebackSize: 0,
          streakMax: 2,
        },
        {
          name: "Sprinter",
          sessionId: "s",
          score: 800,
          correctCount: 2,
          fastestAnswer: 300,
          comebackSize: 6,
          streakMax: 4,
        },
        {
          name: "Steady",
          sessionId: "t",
          score: 700,
          correctCount: 7,
          fastestAnswer: 450,
          comebackSize: 3,
          streakMax: 3,
        },
      ],
      "lucky-letters",
    );

    expect(awards[0]).toEqual({
      title: "Champion",
      recipient: "Winner",
      description: "1,000 pts",
    });
    expect(awards).toHaveLength(4);
    expect(awards.map((award) => award.title)).toContain("Speed Demon");
    expect(awards.map((award) => award.title)).toContain("Come From Behind");
    expect(awards.map((award) => award.title)).toContain("Hot Streak");
  });

  it("returns empty awards when no candidates are provided", () => {
    expect(generateAwards([], "brain-board")).toEqual([]);
  });
});
