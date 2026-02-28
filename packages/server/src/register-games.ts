import { createBluffEnginePlugin } from "@partyline/bluff-engine";
import { GameRegistry } from "@partyline/game-engine";
import { createHotTakePlugin } from "@partyline/hot-take";
import { createQuickDrawPlugin } from "@partyline/quick-draw";
import { createRealityDriftPlugin } from "@partyline/reality-drift";
import { createWorldBuilderPlugin } from "@partyline/world-builder";

GameRegistry.registerGame("world-builder", createWorldBuilderPlugin);
GameRegistry.registerGame("bluff-engine", createBluffEnginePlugin);
GameRegistry.registerGame("quick-draw", createQuickDrawPlugin);
GameRegistry.registerGame("reality-drift", createRealityDriftPlugin);
GameRegistry.registerGame("hot-take", createHotTakePlugin);
