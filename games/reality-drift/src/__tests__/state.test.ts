import { computeDriftCount } from "../state";

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
});
