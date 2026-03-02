import type { Complexity, RoundNarrationInput } from "@flimflam/shared";

/**
 * Build the system + user prompts for scenario generation.
 */
export function buildScenarioPrompt(
  playerCount: number,
  complexity: Complexity,
): { system: string; user: string } {
  const toneGuide =
    complexity === "kids"
      ? "Keep the tone silly, lighthearted, and safe for ages 8+. Use cartoon-like scenarios, funny animals, or whimsical adventures. No violence, scary content, or mature themes."
      : complexity === "standard"
        ? "Keep the tone balanced with light humor and mild drama. Think adventure movies rated PG-13. Some light tension and mystery is fine."
        : "Use a strategic, complex tone. Think political intrigue, survival scenarios, or heist planning. Include moral dilemmas and competing objectives.";

  const system = `You are the World Builder AI for a collaborative storytelling party game. You create immersive scenarios where players take on secret roles and collectively shape the narrative through their actions.

Your responses MUST be valid JSON only. No markdown, no explanation, just JSON.

${toneGuide}`;

  const user = `Generate a scenario for ${playerCount} players at "${complexity}" complexity.

Return a JSON object with this exact structure:
{
  "setting": "A vivid description of the location and world (2-3 sentences)",
  "situation": "The dramatic situation or conflict the players find themselves in (2-3 sentences)",
  "world_state": {
    "location": "Name of the location",
    "time_pressure": "Description of urgency",
    "key_resources": ["resource1", "resource2", "resource3"],
    "npcs": [
      {"name": "NPC Name", "role": "their role", "disposition": "friendly/neutral/hostile"}
    ],
    "threats": ["threat1", "threat2"],
    "opportunities": ["opportunity1", "opportunity2"]
  },
  "roles": [
    ${Array.from(
      { length: playerCount },
      (_, i) => `{
      "role_name": "Role ${i + 1} name",
      "public_identity": "What others see about this role",
      "secret_objective": "Hidden goal only this player knows",
      "special_ability": "A unique action this role can take once per game",
      "scoring_criteria": "How this role earns bonus points"
    }`,
    ).join(",\n    ")}
  ],
  "tone": "${complexity === "kids" ? "silly and fun" : complexity === "standard" ? "adventurous" : "strategic and tense"}"
}

Make each role distinct with different secret objectives. Some objectives should align, others should conflict. Every role must have a clear special ability.`;

  return { system, user };
}

/**
 * Build prompts for round narration based on player actions.
 */
export function buildNarrationPrompt(
  gameState: RoundNarrationInput,
  _actions: { sessionId: string; name: string; role: string; action: string }[],
): { system: string; user: string } {
  const system = `You are the narrator for a collaborative storytelling game. You weave player actions into a dramatic narrative, award points based on creativity and strategic thinking, and advance the world state.

Your responses MUST be valid JSON only. No markdown, no explanation, just JSON.`;

  const actionDescriptions = gameState.playerActions
    .map((a) => `- ${a.name} (${a.role}): "${a.action}"`)
    .join("\n");

  const previousContext =
    gameState.previousNarrations.length > 0
      ? `\nPrevious events:\n${gameState.previousNarrations.map((n, i) => `Round ${i + 1}: ${n}`).join("\n")}`
      : "";

  const user = `Round ${gameState.round} of ${gameState.totalRounds}.

Setting: ${gameState.scenario.setting}
Situation: ${gameState.scenario.situation}
${previousContext}

Current world state:
- Location: ${gameState.worldState.location}
- Time pressure: ${gameState.worldState.timePressure}
- Resources: ${gameState.worldState.keyResources.join(", ")}
- Threats: ${gameState.worldState.threats.join(", ")}
- Opportunities: ${gameState.worldState.opportunities.join(", ")}

Player actions this round:
${actionDescriptions}

Return a JSON object:
{
  "narration": "A vivid 3-5 sentence narrative describing what happens this round based on the players' actions. Reference each player by name.",
  "player_outcomes": [
    ${gameState.playerActions
      .map(
        (a) => `{
      "session_id": "${a.sessionId}",
      "narration": "Personal outcome for ${a.name} (1 sentence)",
      "points": <0-200 based on creativity, relevance, and strategic value>,
      "progress_delta": <-1, 0, or 1 indicating secret objective progress>,
      "reason": "Brief reason for points awarded"
    }`,
      )
      .join(",\n    ")}
  ],
  "world_state_update": {
    "threats": ["updated threat list"],
    "opportunities": ["updated opportunities"],
    "new_developments": ["what changed this round"]
  }${gameState.round === gameState.totalRounds ? ',\n  "dramatic_twist": "A final dramatic twist to end the story"' : ""}
}

Award higher points (150-200) for creative, surprising actions that advance the story. Award moderate points (75-150) for solid, logical actions. Award low points (0-75) for generic or counterproductive actions.`;

  return { system, user };
}

/**
 * Build prompts for end-of-game bonus judging.
 */
export function buildBonusJudgingPrompt(gameHistory: {
  scenario: { setting: string; situation: string };
  rounds: { narration: string; actions: { sessionId: string; name: string; action: string }[] }[];
}): { system: string; user: string } {
  const system = `You are judging a completed collaborative storytelling game. Review all player actions across all rounds and determine bonus awards.

Your responses MUST be valid JSON only. No markdown, no explanation, just JSON.`;

  const roundSummaries = gameHistory.rounds
    .map(
      (r, i) =>
        `Round ${i + 1}:\n  Narration: ${r.narration}\n  Actions: ${r.actions.map((a) => `${a.name}: "${a.action}"`).join(", ")}`,
    )
    .join("\n\n");

  // Collect all unique player sessionIds
  const allPlayers = new Map<string, string>();
  for (const round of gameHistory.rounds) {
    for (const action of round.actions) {
      allPlayers.set(action.sessionId, action.name);
    }
  }

  const playerList = Array.from(allPlayers.entries())
    .map(([sid, name]) => `  "${sid}": "${name}"`)
    .join("\n");

  const user = `Setting: ${gameHistory.scenario.setting}
Situation: ${gameHistory.scenario.situation}

${roundSummaries}

Players:
${playerList}

Determine these bonus awards. Choose from the players above using their session_id:
{
  "best_action": {
    "session_id": "<session_id of the player with the single best action across all rounds>",
    "reason": "Why this was the best action (1 sentence)",
    "points": 150
  },
  "chaos_agent": {
    "session_id": "<session_id of the player who caused the most unexpected/chaotic events>",
    "reason": "Why they were the chaos agent (1 sentence)",
    "points": 100
  },
  "mvp_moment": {
    "description": "The single most memorable moment of the entire game (1-2 sentences)"
  }
}

Each bonus MUST go to a different player if possible.`;

  return { system, user };
}
