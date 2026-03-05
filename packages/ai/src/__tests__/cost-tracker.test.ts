import { CostTracker } from "../cost-tracker";

describe("ai/cost-tracker", () => {
  it("tracks usage per room and aggregates totals", () => {
    const tracker = new CostTracker();
    tracker.trackUsage("room-a", 1000, 2000);
    tracker.trackUsage("room-a", 400, 600);
    tracker.trackUsage("room-b", 500, 800);

    expect(tracker.getRoomUsage("room-a")).toEqual({
      inputTokens: 1400,
      outputTokens: 2600,
      requestCount: 2,
    });
    expect(tracker.getTotalUsage()).toEqual({
      inputTokens: 1900,
      outputTokens: 3400,
      requestCount: 3,
    });
  });

  it("estimates cost from all-room and per-room usage", () => {
    const tracker = new CostTracker();
    tracker.trackUsage("room-a", 1_000_000, 1_000_000);
    tracker.trackUsage("room-b", 500_000, 0);

    expect(tracker.estimateCost("room-a")).toBeCloseTo(18, 6);
    expect(tracker.estimateCost()).toBeCloseTo(19.5, 6);
    expect(tracker.estimateCost("missing-room")).toBe(0);
  });

  it("clears room usage and resets all data", () => {
    const tracker = new CostTracker();
    tracker.trackUsage("room-a", 100, 100);
    tracker.trackUsage("room-b", 200, 200);

    tracker.clearRoom("room-a");
    expect(tracker.getRoomUsage("room-a")).toBeUndefined();
    expect(tracker.getTotalUsage()).toEqual({
      inputTokens: 200,
      outputTokens: 200,
      requestCount: 1,
    });

    tracker.reset();
    expect(tracker.getTotalUsage()).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      requestCount: 0,
    });
  });
});
