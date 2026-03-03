"use client";

import { getColyseusClient, resolveColyseusHttpUrl } from "@/lib/colyseus-client";
import {
  type Complexity,
  type HostViewData,
  type PlayerData,
  RECONNECTION_TIMEOUT_MS,
  resolveRoomIdByCode,
} from "@flimflam/shared";
import type { Room } from "colyseus.js";
import { useCallback, useEffect, useRef, useState } from "react";

interface RoomState {
  phase: string;
  selectedGameId: string;
  complexity: Complexity;
  hotTakePlayerInputEnabled: boolean;
  round: number;
  totalRounds: number;
  timerEndsAt: number;
}

interface UseRoomReturn {
  room: Room | null;
  state: RoomState | null;
  players: Map<string, PlayerData>;
  gameData: HostViewData | null;
  createRoom: () => Promise<string>;
  joinRoom: (code: string) => Promise<void>;
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
  error: string | null;
  connected: boolean;
  reconnecting: boolean;
  roomCode: string | null;
  ready: boolean;
  clockOffset: number;
}

const RECONNECT_TOKEN_KEY = "flimflam_host_reconnect_token";
const ROOM_CODE_KEY = "flimflam_host_room_code";
const HOST_TOKEN_KEY = "flimflam_host_token";
const ROOM_CODE_TIMEOUT_MS = 5000;

function storageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {}
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function storageRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {}
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function useRoom(): UseRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [players, setPlayers] = useState<Map<string, PlayerData>>(new Map());
  const [gameData, setGameData] = useState<HostViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const reconnectAttempted = useRef(false);
  const connectedRef = useRef(false);
  const roomRef = useRef<Room | null>(null);
  const reconnectInProgress = useRef(false);
  const reconnectEpoch = useRef(0);
  const reconnectFnRef = useRef<(() => void) | null>(null);
  const clockOffsetRef = useRef(0);

  const attachListeners = useCallback((joinedRoom: Room) => {
    // Cancel any reconnect loops.
    reconnectEpoch.current += 1;

    roomRef.current = joinedRoom;
    setRoom(joinedRoom);
    setConnected(true);
    connectedRef.current = true;
    setReconnecting(false);
    setError(null);

    joinedRoom.onMessage("host-token", (data: { token?: unknown }) => {
      if (typeof window === "undefined") return;
      if (data && typeof data.token === "string" && data.token.trim()) {
        storageSet(HOST_TOKEN_KEY, data.token);
      }
    });

    // Request the host token after handlers are registered (avoids missing a
    // token message that could arrive before onMessage() is set up).
    joinedRoom.send("host:request_token");

    // Save session info for reconnection
    storageSet(RECONNECT_TOKEN_KEY, joinedRoom.reconnectionToken);

    // Listen for state changes
    const roomState = joinedRoom.state as Record<string, unknown>;

    const listenField = (field: string, setter: (val: unknown) => void) => {
      if (roomState && typeof roomState.listen === "function") {
        roomState.listen(field, (value: unknown) => {
          setter(value);
        });
      }
    };

    // Initialize state from room state
    setState({
      phase: (roomState.phase as string) ?? "lobby",
      selectedGameId: (roomState.selectedGameId as string) ?? "",
      complexity: (roomState.complexity as Complexity) ?? "standard",
      hotTakePlayerInputEnabled: (roomState.hotTakePlayerInputEnabled as boolean) ?? false,
      round: (roomState.round as number) ?? 0,
      totalRounds: (roomState.totalRounds as number) ?? 0,
      timerEndsAt: (roomState.timerEndsAt as number) ?? 0,
    });

    listenField("phase", (value) => {
      setState((prev) => (prev ? { ...prev, phase: value as string } : prev));
    });

    listenField("selectedGameId", (value) => {
      setState((prev) => (prev ? { ...prev, selectedGameId: value as string } : prev));
    });

    listenField("complexity", (value) => {
      setState((prev) => (prev ? { ...prev, complexity: value as Complexity } : prev));
    });

    listenField("hotTakePlayerInputEnabled", (value) => {
      setState((prev) => (prev ? { ...prev, hotTakePlayerInputEnabled: value as boolean } : prev));
    });

    listenField("round", (value) => {
      setState((prev) => (prev ? { ...prev, round: value as number } : prev));
    });

    listenField("totalRounds", (value) => {
      setState((prev) => (prev ? { ...prev, totalRounds: value as number } : prev));
    });

    listenField("timerEndsAt", (value) => {
      setState((prev) => (prev ? { ...prev, timerEndsAt: value as number } : prev));
    });

    // Player tracking
    const playersMap = roomState.players as
      | {
          onAdd?: (cb: (player: unknown, key: string) => void) => void;
          onRemove?: (cb: (player: unknown, key: string) => void) => void;
          forEach?: (cb: (player: unknown, key: string) => void) => void;
        }
      | undefined;

    if (playersMap) {
      if (typeof playersMap.forEach === "function") {
        const initial = new Map<string, PlayerData>();
        playersMap.forEach((player: unknown, key: string) => {
          initial.set(key, player as PlayerData);
        });
        setPlayers(initial);
      }

      if (typeof playersMap.onAdd === "function") {
        playersMap.onAdd((player: unknown, key: string) => {
          setPlayers((prev) => {
            const next = new Map(prev);
            next.set(key, player as PlayerData);
            return next;
          });

          // Listen for individual player changes
          const schemaPlayer = player as Record<string, unknown>;
          if (typeof schemaPlayer.listen === "function") {
            const refresh = () => {
              setPlayers((prev) => {
                const next = new Map(prev);
                next.set(key, player as PlayerData);
                return next;
              });
            };

            schemaPlayer.listen("score", refresh);
            schemaPlayer.listen("ready", refresh);
            schemaPlayer.listen("connected", refresh);
          }
        });
      }

      if (typeof playersMap.onRemove === "function") {
        playersMap.onRemove((_player: unknown, key: string) => {
          setPlayers((prev) => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
        });
      }
    }

    // Game data messages from server
    joinedRoom.onMessage("game-data", (data: HostViewData) => {
      setGameData(data);
    });

    joinedRoom.onMessage("error", (data: { message: string }) => {
      setError(data.message);
    });

    // Clock sync: compute offset between server and client clocks.
    joinedRoom.onMessage("server-time", (data: { serverTime?: number }) => {
      if (typeof data?.serverTime === "number") {
        clockOffsetRef.current = data.serverTime - Date.now();
      }
    });

    joinedRoom.onLeave((code: number) => {
      roomRef.current = null;
      setConnected(false);
      connectedRef.current = false;

      // Normal / intentional close.
      if (code === 1000) {
        setRoom(null);
        setState(null);
        setPlayers(new Map());
        setGameData(null);
        setRoomCode(null);
        setReconnecting(false);
        setError(null);
        storageRemove(RECONNECT_TOKEN_KEY);
        storageRemove(ROOM_CODE_KEY);
        storageRemove(HOST_TOKEN_KEY);
        return;
      }

      setRoom(null);
      setReconnecting(true);
      setError(`Connection lost (code: ${code}). Reconnecting...`);
      reconnectFnRef.current?.();
    });

    joinedRoom.onError((code: number, message?: string) => {
      setError(`Room error ${code}: ${message ?? "Unknown error"}`);
    });
  }, []);

  const reconnect = useCallback(
    async (opts?: { clearStaleTokens?: boolean }): Promise<boolean> => {
      if (reconnectInProgress.current) return false;
      reconnectInProgress.current = true;

      const clearStaleTokens = opts?.clearStaleTokens ?? true;

      try {
        const token = storageGet(RECONNECT_TOKEN_KEY);
        if (!token) {
          return false;
        }

        const client = getColyseusClient();
        const reconnectedRoom = await new Promise<Room>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Reconnect timed out")), 8000);
          client.reconnect(token).then(
            (joinedRoom) => {
              clearTimeout(timeout);
              resolve(joinedRoom);
            },
            (err) => {
              clearTimeout(timeout);
              reject(err);
            },
          );
        });

        attachListeners(reconnectedRoom);

        // Keep URL + UI stable even if the route param was stale.
        const stateObj = reconnectedRoom.state as Record<string, unknown>;
        const codeFromState =
          typeof stateObj.roomCode === "string" && stateObj.roomCode.length === 4
            ? stateObj.roomCode
            : null;
        const normalized = (codeFromState ?? storageGet(ROOM_CODE_KEY) ?? "").toUpperCase();
        if (normalized) {
          setRoomCode(normalized);
          storageSet(ROOM_CODE_KEY, normalized);
        }

        return true;
      } catch {
        if (clearStaleTokens) {
          storageRemove(RECONNECT_TOKEN_KEY);
          storageRemove(ROOM_CODE_KEY);
          storageRemove(HOST_TOKEN_KEY);
        }
        return false;
      } finally {
        reconnectInProgress.current = false;
      }
    },
    [attachListeners],
  );

  const startReconnectLoop = useCallback(() => {
    const epoch = reconnectEpoch.current + 1;
    reconnectEpoch.current = epoch;

    setReconnecting(true);

    void (async () => {
      const deadline = Date.now() + RECONNECTION_TIMEOUT_MS - 2000; // keep a small buffer vs server window
      let attempt = 0;

      while (reconnectEpoch.current === epoch && Date.now() < deadline) {
        const ok = await reconnect({ clearStaleTokens: false });
        if (ok) return;

        attempt++;

        // If the browser is explicitly offline, avoid hammering.
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          await new Promise((resolve) => setTimeout(resolve, 750));
          continue;
        }

        const delay = Math.min(250 * 2 ** Math.min(attempt, 4), 4000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      if (reconnectEpoch.current !== epoch) return;

      // One final attempt: if the token is stale/invalid, clear it so a manual refresh
      // doesn't get stuck in a bad loop.
      await reconnect({ clearStaleTokens: true });

      setReconnecting(false);
      if (!connectedRef.current) {
        setError("Unable to reconnect. Please refresh to continue.");
      }
    })();
  }, [reconnect]);

  useEffect(() => {
    reconnectFnRef.current = () => startReconnectLoop();
  }, [startReconnectLoop]);

  const createRoom = useCallback(async (): Promise<string> => {
    setError(null);
    const client = getColyseusClient();
    let joinedRoom: Room;
    try {
      joinedRoom = await client.create("party", {
        isHost: true,
        name: "Host",
        hostToken:
          typeof window !== "undefined" ? (storageGet(HOST_TOKEN_KEY) ?? undefined) : undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create room";
      setError(message);
      throw err;
    }
    attachListeners(joinedRoom);

    const stateObj = joinedRoom.state as Record<string, unknown>;
    const immediateCode =
      typeof stateObj.roomCode === "string" && stateObj.roomCode.length === 4
        ? stateObj.roomCode
        : null;

    const code =
      (
        immediateCode ??
        (await new Promise<string>((resolve, reject) => {
          if (typeof stateObj.listen !== "function") {
            reject(new Error("Room code not available (no state listener)."));
            return;
          }

          const timeoutId = setTimeout(() => {
            reject(new Error("Timed out waiting for room code."));
          }, ROOM_CODE_TIMEOUT_MS);

          stateObj.listen("roomCode", (value: unknown) => {
            if (typeof value === "string" && value.length === 4) {
              clearTimeout(timeoutId);
              resolve(value);
            }
          });
        }))
      )?.toUpperCase() ?? "";

    if (!code) {
      setError("Failed to read room code from server.");
      throw new Error("Failed to read room code from server.");
    }

    setRoomCode(code);

    storageSet(ROOM_CODE_KEY, code);

    return code;
  }, [attachListeners]);

  const joinRoom = useCallback(
    async (code: string): Promise<void> => {
      setError(null);
      const client = getColyseusClient();
      const normalizedCode = code.toUpperCase().trim();

      let roomId: string;
      try {
        const resolved = await resolveRoomIdByCode(resolveColyseusHttpUrl(), normalizedCode);

        if (!resolved.ok) {
          if (resolved.error === "not_found") {
            setError(`Room with code "${normalizedCode}" not found.`);
            return;
          }
          if (resolved.error === "rate_limited") {
            setError("Too many attempts. Please wait a moment and try again.");
            return;
          }
          if (resolved.error === "invalid_code") {
            setError("Invalid room code. Check the code and try again.");
            return;
          }

          throw new Error("Failed to resolve room. Please try again.");
        }

        roomId = resolved.roomId;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to resolve room";
        setError(message);
        throw err;
      }

      let joinedRoom: Room;
      try {
        joinedRoom = await client.joinById(roomId, {
          isHost: true,
          name: "Host",
          hostToken: storageGet(HOST_TOKEN_KEY) ?? undefined,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to join room";
        setError(message);
        throw err;
      }
      attachListeners(joinedRoom);
      setRoomCode(code.toUpperCase());

      storageSet(ROOM_CODE_KEY, code.toUpperCase());
    },
    [attachListeners],
  );

  const sendMessage = useCallback((type: string, data?: Record<string, unknown>) => {
    if (!connectedRef.current) return;
    if (!roomRef.current) return;
    roomRef.current.send(type, data ?? {});
  }, []);

  // Auto-reconnection on mount
  useEffect(() => {
    if (reconnectAttempted.current) return;
    reconnectAttempted.current = true;

    if (typeof window === "undefined") {
      setReady(true);
      return;
    }

    const savedToken = storageGet(RECONNECT_TOKEN_KEY);
    const savedCode = storageGet(ROOM_CODE_KEY);

    if (!savedToken) {
      setReady(true);
      return;
    }

    setReconnecting(true);

    void (async () => {
      try {
        // In dev/StrictMode and during route transitions, the server may not have
        // processed the prior disconnect yet. Retry a few times before giving up.
        const maxAttempts = 4;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const ok = await reconnect({ clearStaleTokens: attempt === maxAttempts - 1 });
          if (ok) break;

          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        }

        if (!connectedRef.current && savedCode) {
          setRoomCode(savedCode.toUpperCase());
        }
      } finally {
        setReady(true);
        if (!connectedRef.current) {
          setReconnecting(false);
        }
      }
    })();
  }, [reconnect]);

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  // If the browser goes offline and comes back, try again immediately.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onOnline = () => {
      if (connectedRef.current) return;
      if (!storageGet(RECONNECT_TOKEN_KEY)) return;
      startReconnectLoop();
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [startReconnectLoop]);

  return {
    room,
    state,
    players,
    gameData,
    createRoom,
    joinRoom,
    sendMessage,
    error,
    connected,
    reconnecting,
    roomCode,
    ready,
    clockOffset: clockOffsetRef.current,
  };
}
