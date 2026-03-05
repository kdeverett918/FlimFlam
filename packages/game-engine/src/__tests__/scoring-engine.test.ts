import { describe, expect, it } from "vitest";
import { ScoringEngine } from "../ScoringEngine";

describe("game-engine/ScoringEngine", () => {
  it("tracks round points, bonuses, and leaderboard ranking", () => {
    const engine = new ScoringEngine();
    engine.initPlayer("p1", "Alex");
    engine.initPlayer("p2", "Blair");
    engine.initPlayer("p3", "Casey");

    engine.addRoundPoints("p1", 1, 200, "Correct answer");
    engine.addRoundPoints("p2", 1, 300, "Power play");
    engine.addRoundPoints("p3", 1, 300, "Steal");
    engine.addBonus("p1", 50, "Speed bonus");

    expect(engine.getTotalPoints("p1")).toBe(250);
    expect(engine.getTotalPoints("p2")).toBe(300);
    expect(engine.getTotalPoints("missing")).toBe(0);

    const leaderboard = engine.getLeaderboard();
    expect(leaderboard).toHaveLength(3);
    expect(leaderboard.map((entry) => entry.name)).toEqual(["Blair", "Casey", "Alex"]);
    expect(leaderboard.map((entry) => entry.rank)).toEqual([1, 1, 3]);
    expect(leaderboard[2]?.breakdown).toEqual([
      { label: "R1: Correct answer", points: 200 },
      { label: "Speed bonus", points: 50 },
    ]);
  });

  it("clamps totals to zero in kids mode when penalties would go negative", () => {
    const engine = new ScoringEngine(true);
    engine.initPlayer("p1", "Kai");

    engine.addRoundPoints("p1", 1, -50, "Penalty");
    expect(engine.getTotalPoints("p1")).toBe(0);

    engine.addBonus("p1", -25, "Bonus penalty");
    expect(engine.getTotalPoints("p1")).toBe(0);
  });

  it("ignores scoring calls for unknown players and supports reset", () => {
    const engine = new ScoringEngine();
    engine.addRoundPoints("missing", 1, 100, "No-op");
    engine.addBonus("missing", 25, "No-op");

    expect(engine.getLeaderboard()).toEqual([]);

    engine.initPlayer("p1", "Mina");
    engine.addRoundPoints("p1", 1, 100, "Correct");
    expect(engine.getLeaderboard()).toHaveLength(1);

    engine.reset();
    expect(engine.getLeaderboard()).toEqual([]);
  });
});
