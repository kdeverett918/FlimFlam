import { MapSchema, Schema, type } from "@colyseus/schema";

export class GamePlayerSchema extends Schema {
  @type("string") sessionId = "";
  @type("string") name = "";
  @type("string") avatarColor = "";
  @type("boolean") isHost = false;
  @type("boolean") connected = true;
  @type("boolean") hasSubmitted = false;
  @type("number") totalPoints = 0;
  @type("string") role = "";
  @type("string") publicInfo = "";
  @type("number") progressOrCustomInt = 0;
  @type("boolean") abilityOrCustomBool = false;
  @type("string") currentInput = "";
}

export class RoomState extends Schema {
  @type("string") roomCode = "";
  @type("string") lobbyPhase = "waiting";
  @type("string") gamePhase = "";
  @type("string") selectedGameId = "";
  @type("string") complexity = "standard";
  @type("string") hostSessionId = "";
  @type({ map: GamePlayerSchema }) players = new MapSchema<GamePlayerSchema>();
  @type("number") timerEndsAt = 0;
  @type("number") round = 0;
  @type("number") totalRounds = 0;
}
