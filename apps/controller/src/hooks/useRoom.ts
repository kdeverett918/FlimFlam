"use client";

import { getColyseusClient } from "@/lib/colyseus-client";
import type { PlayerData } from "@partyline/shared";
import type { Room } from "colyseus.js";
import { useCallback, useEffect, useRef, useState } from "react";

const RECONNECT_TOKEN_KEY = "partyline_reconnect_token";
const ROOM_ID_KEY = "partyline_room_id";

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
  connected: boolean;
  myPlayer: PlayerData | null;
}

export function useRoom(): UseRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [privateData, setPrivateData] = useState<PrivateData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [myPlayer, setMyPlayer] = useState<PlayerData | null>(null);
  const previousPhaseRef = useRef<string | null>(null);
  const roomRef = useRef<Room | null>(null);

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
        const gameId = (stateObj.gameId as string) ?? "";
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
          | undefined;

        if (playersMap) {
          const playerList: PlayerData[] = [];
          if (playersMap instanceof Map) {
            for (const [, player] of playersMap) {
              playerList.push(player as unknown as PlayerData);
            }
          } else if (typeof playersMap === "object") {
            // Colyseus MapSchema serialized as object with forEach or plain object
            const mapLike = playersMap as unknown as {
              entries?: () => Iterable<[string, PlayerData]>;
            };
            if (typeof mapLike.entries === "function") {
              for (const [, player] of mapLike.entries()) {
                playerList.push(player as unknown as PlayerData);
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
      });

      // Connection handlers
      activeRoom.onLeave((code) => {
        setConnected(false);
        if (code !== 1000) {
          setError("Connection lost. Trying to reconnect...");
        }
      });

      activeRoom.onError((code, message) => {
        setError(`Connection error: ${message ?? code}`);
      });
    },
    [vibrate],
  );

  // Try reconnection on mount
  useEffect(() => {
    const tryReconnect = async () => {
      if (typeof sessionStorage === "undefined") return;

      const token = sessionStorage.getItem(RECONNECT_TOKEN_KEY);
      if (!token) return;

      try {
        const client = getColyseusClient();
        const reconnectedRoom = await client.reconnect(token);
        setupRoomListeners(reconnectedRoom);
      } catch {
        // Clear stale tokens
        sessionStorage.removeItem(RECONNECT_TOKEN_KEY);
        sessionStorage.removeItem(ROOM_ID_KEY);
      }
    };

    tryReconnect();

    return () => {
      if (roomRef.current) {
        roomRef.current.leave(true);
        roomRef.current = null;
      }
    };
  }, [setupRoomListeners]);

  const joinRoom = useCallback(
    async (code: string, name: string, color: string): Promise<boolean> => {
      setError(null);
      try {
        const client = getColyseusClient();
        const normalizedCode = code.toUpperCase().trim();

        // Find room by code
        const rooms = await client.getAvailableRooms("party");
        const targetRoom = rooms.find(
          (r) => (r.metadata as { code?: string })?.code === normalizedCode,
        );

        if (!targetRoom) {
          setError("Room not found. Check the code and try again.");
          return false;
        }

        const joinedRoom = await client.joinById(targetRoom.roomId, {
          name,
          color,
        });

        setupRoomListeners(joinedRoom);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to join room";
        setError(message);
        return false;
      }
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
    connected,
    myPlayer,
  };
}
