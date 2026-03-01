import type { GameManifest } from "@flimflam/shared";
import type { GamePlugin } from "./GamePlugin";

type GameFactory = () => GamePlugin;

class GameRegistrySingleton {
  private games: Map<string, GameFactory> = new Map();

  registerGame(id: string, factory: GameFactory): void {
    this.games.set(id, factory);
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
