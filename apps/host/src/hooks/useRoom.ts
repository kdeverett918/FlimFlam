"use client";

import { getColyseusClient } from "@/lib/colyseus-client";
import type { Complexity, HostViewData, PlayerData } from "@partyline/shared";
import type { Room } from "colyseus.js";
import { useCallback, useEffect, useRef, useState } from "react";

interface RoomState {
  phase: string;
  selectedGameId: string;
  complexity: Complexity;
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
  roomCode: string | null;
  ready: boolean;
}

const RECONNECT_TOKEN_KEY = "partyline_host_reconnect_token";
const ROOM_CODE_KEY = "partyline_host_room_code";
const ROOM_CODE_TIMEOUT_MS = 5000;

export function useRoom(): UseRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [players, setPlayers] = useState<Map<string, PlayerData>>(new Map());
  const [gameData, setGameData] = useState<HostViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const reconnectAttempted = useRef(false);

  const attachListeners = useCallback((joinedRoom: Room) => {
    setRoom(joinedRoom);
    setConnected(true);
    setError(null);

    // Save session info for reconnection
    if (typeof window !== "undefined") {
      sessionStorage.setItem(RECONNECT_TOKEN_KEY, joinedRoom.reconnectionToken);
    }

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

    joinedRoom.onLeave((code: number) => {
      setConnected(false);
      if (code !== 1000) {
        setError(`Disconnected (code: ${code}). Attempting to reconnect...`);
      }
    });

    joinedRoom.onError((code: number, message?: string) => {
      setError(`Room error ${code}: ${message ?? "Unknown error"}`);
    });
  }, []);

  const createRoom = useCallback(async (): Promise<string> => {
    setError(null);
    const client = getColyseusClient();
    let joinedRoom: Room;
    try {
      joinedRoom = await client.create("party", {
        isHost: true,
        name: "Host",
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

    if (typeof window !== "undefined") {
      sessionStorage.setItem(ROOM_CODE_KEY, code);
    }

    return code;
  }, [attachListeners]);

  const joinRoom = useCallback(
    async (code: string): Promise<void> => {
      setError(null);
      const client = getColyseusClient();

      let rooms: Array<{ roomId: string; metadata?: unknown }>;
      try {
        rooms = await client.getAvailableRooms("party");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch rooms";
        setError(message);
        throw err;
      }

      const target = rooms.find((r) => {
        if (!r.metadata || typeof r.metadata !== "object") return false;
        return (r.metadata as Record<string, unknown>).code === code.toUpperCase();
      });

      if (!target) {
        setError(`Room with code "${code}" not found.`);
        return;
      }

      let joinedRoom: Room;
      try {
        joinedRoom = await client.joinById(target.roomId, {
          isHost: true,
          name: "Host",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to join room";
        setError(message);
        throw err;
      }
      attachListeners(joinedRoom);
      setRoomCode(code.toUpperCase());

      if (typeof window !== "undefined") {
        sessionStorage.setItem(ROOM_CODE_KEY, code.toUpperCase());
      }
    },
    [attachListeners],
  );

  const sendMessage = useCallback(
    (type: string, data?: Record<string, unknown>) => {
      if (room) {
        room.send(type, data ?? {});
      }
    },
    [room],
  );

  // Auto-reconnection on mount
  useEffect(() => {
    if (reconnectAttempted.current) return;
    reconnectAttempted.current = true;

    if (typeof window === "undefined") {
      setReady(true);
      return;
    }

    const savedToken = sessionStorage.getItem(RECONNECT_TOKEN_KEY);
    const savedCode = sessionStorage.getItem(ROOM_CODE_KEY);

    if (!savedToken) {
      setReady(true);
      return;
    }

    const client = getColyseusClient();
    client
      .reconnect(savedToken)
      .then((joinedRoom) => {
        attachListeners(joinedRoom);
        const stateObj = joinedRoom.state as Record<string, unknown>;
        const codeFromState =
          typeof stateObj.roomCode === "string" && stateObj.roomCode.length === 4
            ? stateObj.roomCode
            : null;
        const normalized = (codeFromState ?? savedCode ?? "").toUpperCase();
        if (normalized) {
          setRoomCode(normalized);
        }
      })
      .catch(() => {
        sessionStorage.removeItem(RECONNECT_TOKEN_KEY);
        sessionStorage.removeItem(ROOM_CODE_KEY);
      })
      .finally(() => {
        setReady(true);
      });
  }, [attachListeners]);

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
    roomCode,
    ready,
  };
}
