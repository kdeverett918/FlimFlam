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

/* ----------------------------------------------------------------
   Types
   ---------------------------------------------------------------- */

interface RoomState {
  phase: string;
  selectedGameId: string;
  complexity: Complexity;
  hotTakePlayerInputEnabled: boolean;
  round: number;
  totalRounds: number;
  timerEndsAt: number;
  hostSessionId: string;
}

interface PrivateData {
  role?: string;
  publicIdentity?: string;
  secretObjective?: string;
  specialAbility?: string;
  abilityId?: string;
  outcome?: string;
  [key: string]: unknown;
}

export interface UseGameRoomReturn {
  room: Room | null;
  state: RoomState | null;
  players: Map<string, PlayerData>;
  playerList: PlayerData[];
  gameData: HostViewData | null;
  privateData: PrivateData | null;
  gameEvents: Record<string, Record<string, unknown>>;
  mySessionId: string | null;
  myPlayer: PlayerData | null;
  isHost: boolean;
  createRoom: (opts: { name: string; color: string }) => Promise<string>;
  joinRoom: (code: string, name: string, color: string) => Promise<boolean>;
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
  error: string | null;
  errorNonce: number;
  connected: boolean;
  reconnecting: boolean;
  everConnected: boolean;
  roomCode: string | null;
  ready: boolean;
  clockOffset: number;
}

/* ----------------------------------------------------------------
   Storage helpers
   ---------------------------------------------------------------- */

const RECONNECT_TOKEN_KEY = "flimflam_reconnect_token";
const ROOM_CODE_KEY = "flimflam_room_code";
const ROOM_CODE_TIMEOUT_MS = 5000;
const JOIN_MAX_ATTEMPTS = 6;
const JOIN_RETRY_BASE_DELAY_MS = 250;

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

/* ----------------------------------------------------------------
   Hook
   ---------------------------------------------------------------- */

export function useGameRoom(): UseGameRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [players, setPlayers] = useState<Map<string, PlayerData>>(new Map());
  const [gameData, setGameData] = useState<HostViewData | null>(null);
  const [privateData, setPrivateData] = useState<PrivateData | null>(null);
  const [gameEvents, setGameEvents] = useState<Record<string, Record<string, unknown>>>({});
  const [error, setError] = useState<string | null>(null);
  const [errorNonce, setErrorNonce] = useState(0);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [everConnected, setEverConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const connectedRef = useRef(false);
  const reconnectAttempted = useRef(false);
  const reconnectInProgress = useRef(false);
  const reconnectEpoch = useRef(0);
  const reconnectFnRef = useRef<(() => void) | null>(null);
  const clockOffsetRef = useRef(0);
  const previousPhaseRef = useRef<string | null>(null);

  /* ---------- vibrate helper (mobile) ---------- */

  const vibrate = useCallback((duration: number) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(duration);
    }
  }, []);

  /* ---------- attach listeners to a room ---------- */

  const attachListeners = useCallback(
    (joinedRoom: Room) => {
      // Cancel any in-flight reconnect loops.
      reconnectEpoch.current += 1;

      roomRef.current = joinedRoom;
      setRoom(joinedRoom);
      setConnected(true);
      connectedRef.current = true;
      setReconnecting(false);
      setEverConnected(true);
      setError(null);

      // Save reconnection token
      storageSet(RECONNECT_TOKEN_KEY, joinedRoom.reconnectionToken);

      // --- State field listeners ---

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
        hostSessionId: (roomState.hostSessionId as string) ?? "",
      });

      listenField("phase", (value) => {
        const phase = value as string;
        // Vibrate on phase change (useful for mobile/controller)
        if (previousPhaseRef.current !== null && previousPhaseRef.current !== phase) {
          vibrate(50);
        }
        previousPhaseRef.current = phase;
        setState((prev) => (prev ? { ...prev, phase } : prev));
      });

      listenField("selectedGameId", (value) => {
        setState((prev) => (prev ? { ...prev, selectedGameId: value as string } : prev));
      });

      listenField("complexity", (value) => {
        setState((prev) => (prev ? { ...prev, complexity: value as Complexity } : prev));
      });

      listenField("hotTakePlayerInputEnabled", (value) => {
        setState((prev) =>
          prev ? { ...prev, hotTakePlayerInputEnabled: value as boolean } : prev,
        );
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

      listenField("hostSessionId", (value) => {
        setState((prev) => (prev ? { ...prev, hostSessionId: value as string } : prev));
      });

      // --- Player tracking (Map-based, for both host and controller views) ---

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
              schemaPlayer.listen("name", refresh);
              schemaPlayer.listen("color", refresh);
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

      // --- Message listeners ---

      // Game data broadcasts (host view data: board state, categories, etc.)
      joinedRoom.onMessage("game-data", (data: HostViewData) => {
        setGameData(data);

        // Also store in gameEvents for controller-style access
        const dataObj = data as unknown as Record<string, unknown>;
        const msgType =
          typeof dataObj.type === "string"
            ? dataObj.type
            : typeof dataObj.action === "string"
              ? dataObj.action
              : "unknown";
        setGameEvents((prev) => ({ ...prev, [msgType]: dataObj }));
      });

      // Private data messages (role assignment, personal outcomes)
      joinedRoom.onMessage("private-data", (data: PrivateData) => {
        setPrivateData(data ? { ...data } : null);
      });

      // Error messages
      joinedRoom.onMessage("error", (data: { message: string }) => {
        setError(data.message);
        setErrorNonce((prev) => prev + 1);
      });

      // Clock sync
      joinedRoom.onMessage("server-time", (data: { serverTime?: number }) => {
        if (typeof data?.serverTime === "number") {
          clockOffsetRef.current = data.serverTime - Date.now();
        }
      });

      // --- Connection lifecycle ---

      joinedRoom.onLeave((code: number) => {
        roomRef.current = null;
        setConnected(false);
        connectedRef.current = false;

        // Normal / intentional close
        if (code === 1000) {
          setRoom(null);
          setState(null);
          setPlayers(new Map());
          setGameData(null);
          setPrivateData(null);
          setGameEvents({});
          setRoomCode(null);
          setReconnecting(false);
          setError(null);
          storageRemove(RECONNECT_TOKEN_KEY);
          storageRemove(ROOM_CODE_KEY);
          return;
        }

        setRoom(null);
        setReconnecting(true);
        setError(`Connection lost (code: ${code}). Reconnecting...`);
        reconnectFnRef.current?.();
      });

      joinedRoom.onError((code: number, message?: string) => {
        setError(`Room error ${code}: ${message ?? "Unknown error"}`);
        setErrorNonce((prev) => prev + 1);
      });
    },
    [vibrate],
  );

  /* ---------- reconnect logic ---------- */

  const reconnect = useCallback(
    async (opts?: { clearStaleTokens?: boolean }): Promise<boolean> => {
      if (reconnectInProgress.current) return false;
      reconnectInProgress.current = true;

      const clearStaleTokens = opts?.clearStaleTokens ?? true;

      try {
        const token = storageGet(RECONNECT_TOKEN_KEY);
        if (!token) return false;

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

        // Restore room code from state or storage
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
      const deadline = Date.now() + RECONNECTION_TIMEOUT_MS - 2000;
      let attempt = 0;

      while (reconnectEpoch.current === epoch && Date.now() < deadline) {
        const ok = await reconnect({ clearStaleTokens: false });
        if (ok) return;

        attempt++;

        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          await new Promise((resolve) => setTimeout(resolve, 750));
          continue;
        }

        const delay = Math.min(250 * 2 ** Math.min(attempt, 4), 4000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      if (reconnectEpoch.current !== epoch) return;

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

  /* ---------- createRoom ---------- */

  const createRoom = useCallback(
    async (opts: { name: string; color: string }): Promise<string> => {
      setError(null);
      const client = getColyseusClient();

      let joinedRoom: Room;
      try {
        joinedRoom = await client.create("party", {
          name: opts.name,
          color: opts.color,
          isCreator: true,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create room";
        setError(message);
        throw err;
      }

      attachListeners(joinedRoom);

      // Wait for room code from state
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
    },
    [attachListeners],
  );

  /* ---------- joinRoom ---------- */

  const joinRoom = useCallback(
    async (code: string, name: string, color: string): Promise<boolean> => {
      setError(null);
      const client = getColyseusClient();
      const normalizedCode = code.toUpperCase().trim();
      const trimmedName = name.trim();

      for (let attempt = 0; attempt < JOIN_MAX_ATTEMPTS; attempt++) {
        try {
          const resolved = await resolveRoomIdByCode(resolveColyseusHttpUrl(), normalizedCode);

          if (!resolved.ok) {
            if (resolved.error === "not_found") {
              if (attempt < JOIN_MAX_ATTEMPTS - 1) {
                await new Promise((resolve) =>
                  setTimeout(resolve, JOIN_RETRY_BASE_DELAY_MS * (attempt + 1)),
                );
                continue;
              }
              setError("Room not found. Check the code and try again.");
              return false;
            }

            if (resolved.error === "rate_limited") {
              if (attempt < JOIN_MAX_ATTEMPTS - 1) {
                await new Promise((resolve) =>
                  setTimeout(resolve, JOIN_RETRY_BASE_DELAY_MS * (attempt + 3)),
                );
                continue;
              }
              setError("Too many attempts. Please wait a moment and try again.");
              return false;
            }

            if (resolved.error === "invalid_code") {
              setError("Invalid room code. Check the code and try again.");
              return false;
            }

            if (attempt < JOIN_MAX_ATTEMPTS - 1) {
              await new Promise((resolve) =>
                setTimeout(resolve, JOIN_RETRY_BASE_DELAY_MS * (attempt + 1)),
              );
              continue;
            }

            throw new Error("Failed to resolve room. Please try again.");
          }

          const joinedRoom = await client.joinById(resolved.roomId, {
            name: trimmedName,
            color,
          });

          attachListeners(joinedRoom);
          setRoomCode(normalizedCode);
          storageSet(ROOM_CODE_KEY, normalizedCode);
          return true;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to join room";
          const normalizedMessage = message.toLowerCase();
          const isRetryable =
            normalizedMessage.includes("seat reservation expired") ||
            normalizedMessage.includes("not found") ||
            normalizedMessage.includes("timeout") ||
            normalizedMessage.includes("network");

          if (isRetryable && attempt < JOIN_MAX_ATTEMPTS - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, JOIN_RETRY_BASE_DELAY_MS * (attempt + 1)),
            );
            continue;
          }

          setError(message);
          return false;
        }
      }

      setError("Unable to join room. Please try again.");
      return false;
    },
    [attachListeners],
  );

  /* ---------- sendMessage ---------- */

  const sendMessage = useCallback((type: string, data?: Record<string, unknown>) => {
    if (!roomRef.current) return;
    roomRef.current.send(type, data ?? {});
  }, []);

  /* ---------- auto-reconnect on mount ---------- */

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

  // Keep connectedRef in sync.
  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  // If the browser goes online, try reconnecting immediately.
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

  /* ---------- derived values ---------- */

  const mySessionId = room?.sessionId ?? null;

  const isHost = Boolean(
    mySessionId && state?.hostSessionId && mySessionId === state.hostSessionId,
  );

  const playerList: PlayerData[] = [];
  for (const [sessionId, player] of players) {
    playerList.push({
      ...player,
      sessionId: player.sessionId || sessionId,
    });
  }
  playerList.sort((a, b) => b.score - a.score);

  const myPlayer = mySessionId
    ? (playerList.find((p) => p.sessionId === mySessionId) ?? null)
    : null;

  return {
    room,
    state,
    players,
    playerList,
    gameData,
    privateData,
    gameEvents,
    mySessionId,
    myPlayer,
    isHost,
    createRoom,
    joinRoom,
    sendMessage,
    error,
    errorNonce,
    connected,
    reconnecting,
    everConnected,
    roomCode,
    ready,
    clockOffset: clockOffsetRef.current,
  };
}
