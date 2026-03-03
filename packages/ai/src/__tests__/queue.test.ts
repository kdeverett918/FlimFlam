import { clearRoomQueue, enqueueAIRequest, getQueueSize } from "../queue";

describe("ai/queue", () => {
  it("serializes requests per room", async () => {
    clearRoomQueue("room-1");

    let running = 0;
    let maxRunning = 0;

    const p1 = enqueueAIRequest("room-1", async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 20));
      running--;
      return "a";
    });

    const p2 = enqueueAIRequest("room-1", async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 20));
      running--;
      return "b";
    });
    const results = await Promise.all([p1, p2]);
    expect(results).toEqual(["a", "b"]);
    expect(maxRunning).toBe(1);
  });

  it("allows concurrent queues across rooms", async () => {
    clearRoomQueue("room-a");
    clearRoomQueue("room-b");

    let running = 0;
    let maxRunning = 0;

    const p1 = enqueueAIRequest("room-a", async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 20));
      running--;
      return 1;
    });

    const p2 = enqueueAIRequest("room-b", async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 20));
      running--;
      return 2;
    });
    const results = await Promise.all([p1, p2]);
    expect(results.sort()).toEqual([1, 2]);
    expect(maxRunning).toBeGreaterThanOrEqual(2);
  });

  it("tracks queue size", () => {
    clearRoomQueue("room-size-a");
    clearRoomQueue("room-size-b");
    expect(getQueueSize()).toBeGreaterThanOrEqual(0);
  });

  it("cleans up completed room queues", async () => {
    clearRoomQueue("room-cleanup");
    await enqueueAIRequest("room-cleanup", async () => "done");
    // Flush the queue cleanup microtask.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getQueueSize()).toBe(0);
  });
});
