import type { GameManifest } from "@flimflam/shared";
import type { GamePlugin } from "./GamePlugin";

type GameFactory = () => GamePlugin;

class GameRegistrySingleton {
  private games: Map<string, GameFactory> = new Map();
  private frozen = false;

  registerGame(id: string, factory: GameFactory): void {
    if (this.frozen) {
      console.warn(`[GameRegistry] Cannot register "${id}" — registry is frozen.`);
      return;
    }
    if (this.games.has(id)) {
      console.warn(
        `[GameRegistry] Duplicate registration for "${id}". Overwriting previous factory.`,
      );
    }
    this.games.set(id, factory);
  }

  /** Freeze the registry to prevent further registrations after init. */
  freeze(): void {
    this.frozen = true;
  }

  getGame(id: string): GamePlugin | undefined {
    const factory = this.games.get(id);
    return factory ? factory() : undefined;
  }

  getAllGameIds(): string[] {
    return Array.from(this.games.keys());
  }

  getManifests(): GameManifest[] {
    return Array.from(this.games.entries()).map(([_id, factory]) => {
      const plugin = factory();
      return plugin.manifest;
    });
  }
}

export const GameRegistry = new GameRegistrySingleton();
