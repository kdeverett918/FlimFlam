"use client";

import { useRoom } from "@/hooks/useRoom";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

type RoomContextValue = ReturnType<typeof useRoom>;

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
  const room = useRoom();
  return <RoomContext.Provider value={room}>{children}</RoomContext.Provider>;
}

export function useRoomContext(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) {
    throw new Error("useRoomContext must be used within <RoomProvider />");
  }
  return ctx;
}
