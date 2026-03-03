/**
 * Redis Migration Path
 * --------------------
 * When scaling beyond a single process, replace this in-memory Map with Redis:
 *
 * 1. Use `ioredis` as the Redis client.
 * 2. Store room codes via HSET/HGET/HDEL:
 *      HSET  room:codes  <code>  <roomId>
 *      HGET  room:codes  <code>
 *      HDEL  room:codes  <code>
 * 3. Set per-key EXPIRE (e.g. 4 hours) for auto-cleanup of stale codes.
 * 4. Configure Colyseus with RedisPresence and RedisDriver for
 *    multi-process / multi-region room discovery.
 */

type RoomIndexEntry = {
  roomId: string;
  createdAt: number;
};

// In-memory registry for resolving a 4-char room code to the Colyseus roomId.
//
// Colyseus Cloud runs a single PM2 instance for this app (see ecosystem.config.js),
// so an in-process index is sufficient and avoids matchmaker enumeration on clients.
//
// If we ever scale to multiple processes/regions, this must be replaced by a
// shared store (e.g. Redis presence/driver) or a platform-provided lookup.
const byCode = new Map<string, RoomIndexEntry>();

export function registerRoomCode(code: string, roomId: string): void {
  byCode.set(code, { roomId, createdAt: Date.now() });
}

export function unregisterRoomCode(code: string, roomId: string): void {
  const entry = byCode.get(code);
  if (entry && entry.roomId === roomId) {
    byCode.delete(code);
  }
}

export function getRoomIdByCode(code: string): string | null {
  return byCode.get(code)?.roomId ?? null;
}
