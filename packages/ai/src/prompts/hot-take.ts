import type { Complexity, HotTakePlayerProfile, HotTakeRoundHistory } from "@partyline/shared";

function getComplexityGuide(complexity: Complexity): string {
  if (complexity === "kids") {
    return "Target audience is ages 8+. Keep statements playful and age-appropriate. Avoid politics, romance, and upsetting topics.";
  }
  if (complexity === "standard") {
    return "Target audience is teens/adults. Statements can be mildly provocative but should stay fun and social.";
  }
  return "Target audience is adults who enjoy debate. Statements can be provocative across social, political, or ethical themes without being personal or hateful.";
}

/**
 * Build prompt for generating a full Hot Take batch from player-submitted topics.
 */
export function buildHotTakeInitialPrompt(
  complexity: Complexity,
  profiles: HotTakePlayerProfile[],
  totalRounds: number,
): { system: string; user: string } {
  const profileSummary =
    profiles.length > 0
      ? profiles.map((p) => `- ${p.name}: "${p.topic}" (category: ${p.category})`).join("\n")
      : "- No topics submitted. Use broad social topics.";

  const system = `You are a provocative but playful game master for a party game called "Hot Take." Generate opinion statements designed to split the room.

Your responses MUST be valid JSON only. No markdown, no explanation, just JSON.

${getComplexityGuide(complexity)}

CRITICAL RULES:
- Every statement must work on a 5-point agree/disagree scale
- Tailor statements to likely disagreement in this specific group
- Start mild and escalate through the batch
- Never mention player names in statements
- Keep statements concise (prefer under 100 characters)
- Mix categories from player submissions with some wildcard themes
- Avoid generic takes with no tension`;

  const user = `Generate ${totalRounds} hot take statements for this group:

${profileSummary}

Requirements:
- ${totalRounds} statements total
- Escalate from mild in early rounds to spicier later rounds
- At least 2 statements should be inspired by submitted topics
- Include a short internal reasoning note per statement

Return JSON:
{
  "prompts": [
    {
      "statement": "The opinion statement",
      "reasoning": "Why this should split this room",
      "escalation_level": 1
    }
  ]
}`;

  return { system, user };
}

/**
 * Build prompt for generating one adaptive replacement statement mid-game.
 */
export function buildHotTakeAdaptivePrompt(
  complexity: Complexity,
  profiles: HotTakePlayerProfile[],
  roundHistory: HotTakeRoundHistory[],
  remainingRounds: number,
): { system: string; user: string } {
  const profileSummary =
    profiles.length > 0
      ? profiles.map((p) => `- ${p.name}: "${p.topic}" (${p.category})`).join("\n")
      : "- No topic profiles available.";

  const historySummary =
    roundHistory.length > 0
      ? roundHistory
          .map((h) => {
            const votes = Array.from(h.votes.values()).join(", ");
            const shape = h.wasUnanimous ? "UNANIMOUS" : h.wasPolarized ? "POLARIZED" : "MIXED";
            return `Round ${h.round}: "${h.statement}" -> votes [${votes}] (${shape})`;
          })
          .join("\n")
      : "No previous rounds yet.";

  const system = `You are an adaptive game master for "Hot Take." Generate the next statement to maximize disagreement.

Your responses MUST be valid JSON only. No markdown, no explanation, just JSON.

${getComplexityGuide(complexity)}

ADAPTATION RULES:
- If the last round was UNANIMOUS: escalate significantly
- If the last round was POLARIZED: dig deeper into the same fault line
- If the last round was MIXED: maintain similar intensity
- Do not repeat previous statements or obvious duplicates`;

  const user = `Generate 1 replacement hot take statement for this group.

Players:
${profileSummary}

Round history:
${historySummary}

Remaining rounds: ${remainingRounds}

Return JSON:
{
  "prompts": [
    {
      "statement": "The next opinion statement",
      "reasoning": "Why this should split the room now",
      "escalation_level": ${Math.min(10, roundHistory.length + 3)}
    }
  ]
}`;

  return { system, user };
}
