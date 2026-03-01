import { createBluffEnginePlugin } from "@flimflam/bluff-engine";
import { createBrainBattlePlugin } from "@flimflam/brain-battle";
import { GameRegistry } from "@flimflam/game-engine";
import { createHotTakePlugin } from "@flimflam/hot-take";
import { createQuickDrawPlugin } from "@flimflam/quick-draw";
import { createRealityDriftPlugin } from "@flimflam/reality-drift";
import { createWorldBuilderPlugin } from "@flimflam/world-builder";

GameRegistry.registerGame("world-builder", createWorldBuilderPlugin);
GameRegistry.registerGame("bluff-engine", createBluffEnginePlugin);
GameRegistry.registerGame("quick-draw", createQuickDrawPlugin);
GameRegistry.registerGame("reality-drift", createRealityDriftPlugin);
GameRegistry.registerGame("hot-take", createHotTakePlugin);
GameRegistry.registerGame("brain-battle", createBrainBattlePlugin);
