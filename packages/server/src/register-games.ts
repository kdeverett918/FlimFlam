import { createFamilyFeudPlugin } from "@flimflam/family-feud";
import { GameRegistry } from "@flimflam/game-engine";
import { createJeopardyPlugin } from "@flimflam/jeopardy";
import { createWheelOfFortunePlugin } from "@flimflam/wheel-of-fortune";

GameRegistry.registerGame("jeopardy", createJeopardyPlugin);
GameRegistry.registerGame("wheel-of-fortune", createWheelOfFortunePlugin);
GameRegistry.registerGame("family-feud", createFamilyFeudPlugin);
