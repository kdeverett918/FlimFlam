import { computeDriftCount, computeDriftSchedule } from "../state";

describe("reality-drift/state", () => {
  it("computeDriftCount returns at least 1", () => {
    expect(computeDriftCount(1, "kids")).toBeGreaterThanOrEqual(1);
    expect(computeDriftCount(2, "standard")).toBeGreaterThanOrEqual(1);
    expect(computeDriftCount(3, "advanced")).toBeGreaterThanOrEqual(1);
  });

  it("computeDriftCount increases for advanced vs standard at same rounds", () => {
    const rounds = 10;
    expect(computeDriftCount(rounds, "advanced")).toBeGreaterThanOrEqual(
      computeDriftCount(rounds, "standard"),
    );
  });

  it("computeDriftSchedule returns correct length + count", () => {
    const totalRounds = 7;
    const driftCount = 3;
    const schedule = computeDriftSchedule(totalRounds, driftCount, "advanced");
    expect(schedule).toHaveLength(totalRounds);
    expect(schedule.filter(Boolean)).toHaveLength(driftCount);
  });

  it("computeDriftSchedule keeps round 1 real when possible", () => {
    const schedule = computeDriftSchedule(5, 2, "standard");
    expect(schedule[0]).toBe(false);
  });
});
