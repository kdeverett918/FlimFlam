"use client";

import { GameRoomProvider } from "@/components/game/GameRoomProvider";
import type { ReactNode } from "react";

export default function RoomLayout({ children }: { children: ReactNode }) {
  return <GameRoomProvider>{children}</GameRoomProvider>;
}
