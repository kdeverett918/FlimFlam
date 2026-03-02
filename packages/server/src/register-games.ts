import { createBrainBoardPlugin } from "@flimflam/brain-board";
import { GameRegistry } from "@flimflam/game-engine";
import { createLuckyLettersPlugin } from "@flimflam/lucky-letters";
import { createSurveySmashPlugin } from "@flimflam/survey-smash";

GameRegistry.registerGame("brain-board", createBrainBoardPlugin);
GameRegistry.registerGame("lucky-letters", createLuckyLettersPlugin);
GameRegistry.registerGame("survey-smash", createSurveySmashPlugin);
