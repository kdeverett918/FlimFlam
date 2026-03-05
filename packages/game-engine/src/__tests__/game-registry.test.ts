import { afterEach, describe, expect, it, vi } from "vitest";
import type { GamePlugin } from "../GamePlugin";

function createPlugin(id: string, name: string): GamePlugin {
  return {
    manifest: {
      id,
      name,
      description: `${name} description`,
      minPlayers: 2,
      maxPlayers: 8,
      estimatedMinutes: 10,
      aiRequired: false,
      complexityLevels: ["kids", "standard", "advanced"],
      tags: ["test"],
      icon: "T",
    },
    createState: () => ({}) as never,
    onGameStart: () => undefined,
    onPlayerMessage: () => undefined,
    isGameOver: () => false,
    getScores: () => new Map<string, number>(),
  };
}

async function loadRegistry() {
  vi.resetModules();
  const { GameRegistry } = await import("../GameRegistry");
  return GameRegistry;
}

describe("game-engine/GameRegistry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers games, resolves factories, and exposes manifests", async () => {
    const registry = await loadRegistry();
    registry.registerGame("alpha", () => createPlugin("alpha", "Alpha"));
    registry.registerGame("beta", () => createPlugin("beta", "Beta"));

    expect(registry.getAllGameIds().sort()).toEqual(["alpha", "beta"]);
    expect(registry.getGame("alpha")?.manifest.name).toBe("Alpha");
    expect(registry.getGame("missing")).toBeUndefined();

    const manifests = registry.getManifests();
    expect(manifests).toHaveLength(2);
    expect(manifests.map((manifest) => manifest.id).sort()).toEqual(["alpha", "beta"]);
  });

  it("warns and overwrites duplicate registrations", async () => {
    const registry = await loadRegistry();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    registry.registerGame("dup", () => createPlugin("dup", "Original"));
    registry.registerGame("dup", () => createPlugin("dup", "Replacement"));

    expect(warnSpy).toHaveBeenCalledWith(
      '[GameRegistry] Duplicate registration for "dup". Overwriting previous factory.',
    );
    expect(registry.getGame("dup")?.manifest.name).toBe("Replacement");
  });

  it("prevents new registrations after freeze", async () => {
    const registry = await loadRegistry();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    registry.registerGame("before-freeze", () => createPlugin("before-freeze", "Before"));
    registry.freeze();
    registry.registerGame("after-freeze", () => createPlugin("after-freeze", "After"));

    expect(registry.getAllGameIds()).toEqual(["before-freeze"]);
    expect(warnSpy).toHaveBeenCalledWith(
      '[GameRegistry] Cannot register "after-freeze" — registry is frozen.',
    );
  });
});
