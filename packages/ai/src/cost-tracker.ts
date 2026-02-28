interface RoomUsage {
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
}

/**
 * Tracks AI token usage per room for monitoring and cost control.
 */
export class CostTracker {
  private rooms: Map<string, RoomUsage> = new Map();

  /**
   * Record token usage for a room.
   */
  trackUsage(roomId: string, inputTokens: number, outputTokens: number): void {
    const existing = this.rooms.get(roomId);
    if (existing) {
      existing.inputTokens += inputTokens;
      existing.outputTokens += outputTokens;
      existing.requestCount += 1;
    } else {
      this.rooms.set(roomId, {
        inputTokens,
        outputTokens,
        requestCount: 1,
      });
    }
  }

  /**
   * Get usage stats for a specific room.
   */
  getRoomUsage(roomId: string): RoomUsage | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get total usage across all rooms.
   */
  getTotalUsage(): { inputTokens: number; outputTokens: number; requestCount: number } {
    let inputTokens = 0;
    let outputTokens = 0;
    let requestCount = 0;
    for (const usage of this.rooms.values()) {
      inputTokens += usage.inputTokens;
      outputTokens += usage.outputTokens;
      requestCount += usage.requestCount;
    }
    return { inputTokens, outputTokens, requestCount };
  }

  /**
   * Estimate cost in USD based on Claude Sonnet pricing.
   * Input: $3/MTok, Output: $15/MTok (approximate).
   */
  estimateCost(roomId?: string): number {
    const usage = roomId ? this.getRoomUsage(roomId) : this.getTotalUsage();
    if (!usage) return 0;

    const inputCost = (usage.inputTokens / 1_000_000) * 3;
    const outputCost = (usage.outputTokens / 1_000_000) * 15;
    return inputCost + outputCost;
  }

  /**
   * Clear usage data for a room (e.g., when room is disposed).
   */
  clearRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  /**
   * Clear all tracked data.
   */
  reset(): void {
    this.rooms.clear();
  }
}

/** Global singleton cost tracker */
export const costTracker = new CostTracker();
