"use client";

import { GAME_MANIFESTS } from "@flimflam/shared";
import { AnimatedBackground } from "@flimflam/ui";
import { usePathname } from "next/navigation";
import { NavBar } from "./NavBar";
import { PlayerMenuProvider, PlayerMenuSheet } from "./PlayerMenu";

interface AppShellInnerProps {
  children: React.ReactNode;
}

function AppShellInner({ children }: AppShellInnerProps) {
  const pathname = usePathname() ?? "/";
  const isHomepage = pathname === "/";
  const isRoom = pathname.startsWith("/room/");

  // We provide the NavBar with sensible defaults.
  // The actual game state (roomCode, gameName, etc.) is pushed from
  // the room page via the GameRoomNavSync component below.
  return (
    <>
      {/* Ambient animated background — muted, for non-homepage/non-room routes
          (room pages render their own AnimatedBackground) */}
      {!isHomepage && !isRoom && (
        <div className="fixed inset-0 -z-10 opacity-40">
          <AnimatedBackground variant="subtle" />
        </div>
      )}

      {/* Nav bar — hidden on homepage and room pages (room has its own HudShell) */}
      {!isHomepage && !isRoom && (
        <NavBar
          roomCode={null}
          gameName={null}
          round={0}
          totalRounds={0}
          myScore={0}
          isInGame={false}
        />
      )}

      {/* Player menu bottom sheet — always available */}
      <PlayerMenuSheet
        roomCode={null}
        playerCount={0}
        gameName={null}
        isHost={false}
        isInGame={false}
        onLeave={() => {
          window.location.href = "/";
        }}
      />

      {/* Page content with safe area for nav (room pages manage their own padding) */}
      <div style={!isHomepage && !isRoom ? { paddingTop: "calc(56px + env(safe-area-inset-top))" } : undefined}>
        {children}
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PlayerMenuProvider>
      <AppShellInner>{children}</AppShellInner>
    </PlayerMenuProvider>
  );
}

/* ----------------------------------------------------------------
   GameRoomNavSync — placed inside GameRoomProvider context to push
   live game state up to the AppShell's NavBar & PlayerMenu.
   (This is a render-only component, no DOM output.)
   ---------------------------------------------------------------- */

export function getGameName(gameId: string): string | null {
  const manifest = GAME_MANIFESTS.find((g) => g.id === gameId);
  return manifest?.name ?? null;
}
