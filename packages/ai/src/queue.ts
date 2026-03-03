type RequestFn<T> = () => Promise<T>;

const roomQueues: Map<string, Promise<unknown>> = new Map();

/**
 * Enqueue an AI request for a given room. Only one request per room is active at a time.
 * Subsequent requests wait for the previous to complete before starting.
 */
export function enqueueAIRequest<T>(roomId: string, requestFn: RequestFn<T>): Promise<T> {
  const currentQueue = roomQueues.get(roomId) ?? Promise.resolve();

  const next = currentQueue
    .then(() => requestFn())
    .catch((error) => {
      // Re-throw so the caller gets the error, but don't block the queue
      throw error;
    });

  // Always update the queue chain, even on failure (use .catch to prevent unhandled rejection on the chain)
  const chainEnd = next.catch(() => {
    /* swallow for chain continuity */
  });
  roomQueues.set(roomId, chainEnd);
  void chainEnd.finally(() => {
    // Only clear if no newer chain replaced this one.
    if (roomQueues.get(roomId) === chainEnd) {
      roomQueues.delete(roomId);
    }
  });

  return next;
}

/**
 * Clear the queue for a room (e.g., when the room is disposed).
 */
export function clearRoomQueue(roomId: string): void {
  roomQueues.delete(roomId);
}

/**
 * Get the number of rooms that have active queues.
 */
export function getQueueSize(): number {
  return roomQueues.size;
}
