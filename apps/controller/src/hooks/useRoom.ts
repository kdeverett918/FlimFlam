"use client";

import { getColyseusClient } from "@/lib/colyseus-client";
import type { PlayerData } from "@flimflam/shared";
import type { Room } from "colyseus.js";
import { useCallback, useEffect, useRef, useState } from "react";

const RECONNECT_TOKEN_KEY = "flimflam_reconnect_token";
const ROOM_ID_KEY = "flimflam_room_id";
const JOIN_MAX_ATTEMPTS = 6;
const JOIN_RETRY_BASE_DELAY_MS = 250;

interface RoomState {
  phase: string;
  gameId: string;
  round: number;
  totalRounds: number;
  timerEndsAt: number;
  players: Map<string, PlayerData>;
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

interface UseRoomReturn {
  room: Room | null;
  state: RoomState | null;
  players: PlayerData[];
  privateData: PrivateData | null;
  joinRoom: (code: string, name: string, color: string) => Promise<boolean>;
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
  error: string | null;
  errorNonce: number;
  connected: boolean;
  everConnected: boolean;
  myPlayer: PlayerData | null;
  ready: boolean;
}

export function useRoom(): UseRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [privateData, setPrivateData] = useState<PrivateData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorNonce, setErrorNonce] = useState(0);
  const [connected, setConnected] = useState(false);
  const [everConnected, setEverConnected] = useState(false);
  const [myPlayer, setMyPlayer] = useState<PlayerData | null>(null);
  const [ready, setReady] = useState(false);
  const previousPhaseRef = useRef<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const reconnectAttempted = useRef(false);
  const reconnectInProgress = useRef(false);
  const reconnectFnRef = useRef<(() => void) | null>(null);

  const vibrate = useCallback((duration: number) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(duration);
    }
  }, []);

  const setupRoomListeners = useCallback(
    (activeRoom: Room) => {
      roomRef.current = activeRoom;
      setRoom(activeRoom);
      setConnected(true);
      setEverConnected(true);
      setError(null);

      // Store reconnection data
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(RECONNECT_TOKEN_KEY, activeRoom.reconnectionToken);
        sessionStorage.setItem(ROOM_ID_KEY, activeRoom.roomId);
      }

      // Listen to state changes
      activeRoom.onStateChange((newState) => {
        const stateObj = newState as unknown as Record<string, unknown>;

        const phase = (stateObj.phase as string) ?? "lobby";
        const gameId = (stateObj.selectedGameId as string) ?? "";
        const round = (stateObj.round as number) ?? 0;
        const totalRounds = (stateObj.totalRounds as number) ?? 0;
        const timerEndsAt = (stateObj.timerEndsAt as number) ?? 0;

        // Phase change vibration
        if (previousPhaseRef.current !== null && previousPhaseRef.current !== phase) {
          vibrate(50);
        }
        previousPhaseRef.current = phase;

        setState({ phase, gameId, round, totalRounds, timerEndsAt, players: new Map() });

        // Extract players from state
        const playersMap = stateObj.players as
          | Map<string, PlayerData>
          | Record<string, PlayerData>
          | {
              forEach?: (cb: (player: unknown, key: string) => void) => void;
              entries?: () => Iterable<[string, unknown]>;
            }
          | undefined;

        if (playersMap) {
          const playerList: PlayerData[] = [];
          if (playersMap instanceof Map) {
            for (const [, player] of playersMap) {
              playerList.push(player as unknown as PlayerData);
            }
          } else if (typeof playersMap === "object") {
            const mapLike = playersMap as unknown as {
              forEach?: (cb: (player: unknown, key: string) => void) => void;
              entries?: () => Iterable<[string, unknown]>;
            };
            if (typeof mapLike.forEach === "function") {
              // biome-ignore lint/complexity/noForEach: Colyseus MapSchema exposes forEach but not reliably entries()
              mapLike.forEach((player: unknown) => {
                playerList.push(player as PlayerData);
              });
            } else if (typeof mapLike.entries === "function") {
              for (const [, player] of mapLike.entries()) {
                playerList.push(player as PlayerData);
              }
            } else {
              for (const key of Object.keys(playersMap)) {
                const p = (playersMap as Record<string, PlayerData>)[key];
                if (p) playerList.push(p);
              }
            }
          }

          setPlayers(playerList);

          // Find my player
          const me = playerList.find((p) => p.sessionId === activeRoom.sessionId);
          if (me) {
            setMyPlayer(me);
          }
        }
      });

      // Private data messages (role assignment, personal outcomes)
      activeRoom.onMessage("private-data", (data: PrivateData) => {
        setPrivateData((prev) => ({ ...prev, ...data }));
      });

      // Error messages
      activeRoom.onMessage("error", (data: { message: string }) => {
        setError(data.message);
        setErrorNonce((prev) => prev + 1);
      });

      // Connection handlers
      activeRoom.onLeave((code) => {
        setConnected(false);
        if (code !== 1000) {
          setError("Connection lost. Trying to reconnect...");
          reconnectFnRef.current?.();
        }
      });

      activeRoom.onError((code, message) => {
        setError(`Connection error: ${message ?? code}`);
      });
    },
    [vibrate],
  );

  const reconnect = useCallback(
    async (opts?: { clearStaleTokens?: boolean }): Promise<boolean> => {
      if (reconnectInProgress.current) return false;
      reconnectInProgress.current = true;

      const clearStaleTokens = opts?.clearStaleTokens ?? true;

      try {
        if (typeof sessionStorage === "undefined") {
          return false;
        }

        const token = sessionStorage.getItem(RECONNECT_TOKEN_KEY);
        if (!token) {
          return false;
        }

        const client = getColyseusClient();
        // Avoid an indefinite loading state if the server is unreachable.
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

        setupRoomListeners(reconnectedRoom);
        return true;
      } catch {
        if (clearStaleTokens && typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem(RECONNECT_TOKEN_KEY);
          sessionStorage.removeItem(ROOM_ID_KEY);
        }
        return false;
      } finally {
        reconnectInProgress.current = false;
      }
    },
    [setupRoomListeners],
  );

  useEffect(() => {
    reconnectFnRef.current = () => {
      void reconnect({ clearStaleTokens: false });
    };
  }, [reconnect]);

  // Try reconnection on mount
  useEffect(() => {
    let cancelled = false;

    const tryReconnect = async () => {
      if (reconnectAttempted.current) return;
      reconnectAttempted.current = true;

      try {
        const hasToken =
          typeof sessionStorage !== "undefined" &&
          Boolean(sessionStorage.getItem(RECONNECT_TOKEN_KEY));

        if (!hasToken) {
          return;
        }

        // In dev/StrictMode and during route transitions, the server may not have
        // processed the prior disconnect yet. Retry a few times before giving up.
        const maxAttempts = 4;
        for (let attempt = 0; attempt < maxAttempts && !cancelled; attempt++) {
          const ok = await reconnect({ clearStaleTokens: attempt === maxAttempts - 1 });
          if (ok) break;

          // Small backoff helps avoid reconnect races.
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    };

    void tryReconnect();

    return () => {
      cancelled = true;
      if (roomRef.current) {
        // Treat route transitions like an unconsented disconnect so the next page can reconnect
        // using the saved reconnection token.
        roomRef.current.leave(false);
        roomRef.current = null;
      }
    };
  }, [reconnect]);

  const joinRoom = useCallback(
    async (code: string, name: string, color: string): Promise<boolean> => {
      setError(null);
      const client = getColyseusClient();
      const normalizedCode = code.toUpperCase().trim();
      const trimmedName = name.trim();

      for (let attempt = 0; attempt < JOIN_MAX_ATTEMPTS; attempt++) {
        try {
          const rooms = await client.getAvailableRooms("party");
          const targetRoom = rooms.find(
            (r) => (r.metadata as { code?: string })?.code === normalizedCode,
          );

          if (!targetRoom) {
            if (attempt < JOIN_MAX_ATTEMPTS - 1) {
              await new Promise((resolve) =>
                setTimeout(resolve, JOIN_RETRY_BASE_DELAY_MS * (attempt + 1)),
              );
              continue;
            }

            setError("Room not found. Check the code and try again.");
            return false;
          }

          const joinedRoom = await client.joinById(targetRoom.roomId, {
            name: trimmedName,
            color,
          });

          setupRoomListeners(joinedRoom);
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
    [setupRoomListeners],
  );

  const sendMessage = useCallback((type: string, data?: Record<string, unknown>) => {
    if (roomRef.current) {
      roomRef.current.send(type, data);
    }
  }, []);

  return {
    room,
    state,
    players,
    privateData,
    joinRoom,
    sendMessage,
    error,
    errorNonce,
    connected,
    everConnected,
    myPlayer,
    ready,
  };
}
