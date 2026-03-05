"use client";

import { useGameRoom } from "@/hooks/useGameRoom";
import type { UseGameRoomReturn } from "@/hooks/useGameRoom";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

const GameRoomContext = createContext<UseGameRoomReturn | null>(null);

export function GameRoomProvider({ children }: { children: ReactNode }) {
  const room = useGameRoom();
  return <GameRoomContext.Provider value={room}>{children}</GameRoomContext.Provider>;
}

export function useGameRoomContext(): UseGameRoomReturn {
  const ctx = useContext(GameRoomContext);
  if (!ctx) {
    throw new Error("useGameRoomContext must be used within <GameRoomProvider />");
  }
  return ctx;
}
