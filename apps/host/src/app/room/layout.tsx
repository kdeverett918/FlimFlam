"use client";

import type { ReactNode } from "react";
import { RoomProvider } from "./RoomProvider";

export default function RoomLayout({ children }: { children: ReactNode }) {
  // Persist the Colyseus connection across `/room/:code` param changes
  // (e.g. `/room/new` -> `/room/ABCD`) to avoid joining the same room twice.
  return <RoomProvider>{children}</RoomProvider>;
}
