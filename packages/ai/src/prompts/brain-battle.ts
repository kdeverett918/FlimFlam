import type { Complexity } from "@flimflam/shared";

/**
 * Build prompt for generating a 5x5 quiz board from player-submitted topics.
 */
export function buildBoardGenerationPrompt(
  topics: string[],
  complexity: Complexity,
): { system: string; user: string } {
  const difficultyGuide =
    complexity === "kids"
      ? "Target audience is ages 8+. Use simple vocabulary and fun, approachable clues. Even the 1000-point clues should be solvable by a clever kid. Lean into silly, surprising facts."
      : complexity === "standard"
        ? "Target audience is teens/adults. Use pop culture, general knowledge, and moderately tricky clues. 200-point clues should be gettable by most people; 1000-point clues should make people think."
        : "Target audience is adults who enjoy a challenge. Use niche knowledge, wordplay, and genuinely tricky clues. 1000-point clues should stump most players. Embrace puns and lateral thinking.";

  const system = `You are a quiz board designer for a party game called "Brain Battle." Players submitted topics and you must create a 5x5 board of clues organized into 5 categories.

Your responses MUST be valid JSON only. No markdown, no explanation, just JSON.

${difficultyGuide}

Rules:
- Create exactly 5 categories with exactly 5 clues each.
- Values must be 200, 400, 600, 800, 1000 (one of each per category).
- At least 2 categories must be MASHUP categories that creatively combine two or more submitted topics (e.g., "Tax Law & Cheese", "Shakespeare in Space").
- Exactly 1 category must be a "Before & After" category that bridges two topics (e.g., clues where the answer connects two different things).
- Clues must be in Jeopardy-style answer format (declarative statements, NOT questions).
- Correct responses must be in "What is...?" format (or "Who is...?" for people).
- Scale difficulty with point value: 200 = easy, 1000 = hard.
- Each clue must have a unique, specific correct response.
- Keep clues concise (1-2 sentences max).`;

  const user = `Player-submitted topics: ${topics.join(", ")}

Generate a 5x5 quiz board using these topics. Remember:
- At least 2 mashup categories combining submitted topics
- 1 "Before & After" category
- Remaining categories can be straight from submitted topics or creative variations
- Values: 200, 400, 600, 800, 1000 per category

Return a JSON object:
{
  "categories": [
    {
      "name": "Category Name",
      "clues": [
        { "answer": "This declarative clue statement", "question": "What is the correct response?", "value": 200 },
        { "answer": "...", "question": "What is...?", "value": 400 },
        { "answer": "...", "question": "What is...?", "value": 600 },
        { "answer": "...", "question": "What is...?", "value": 800 },
        { "answer": "...", "question": "What is...?", "value": 1000 }
      ]
    }
  ]
}`;

  return { system, user };
}

/**
 * Build prompt for judging whether a player's answer is correct.
 */
export function buildAnswerJudgePrompt(
  clueAnswer: string,
  correctQuestion: string,
  playerAnswer: string,
): { system: string; user: string } {
  const system = `You are a lenient quiz judge for a party game called "Brain Battle."

Your responses MUST be valid JSON only. No markdown, no explanation, just JSON.

Judging guidelines:
- Be lenient. This is a party game, not a courtroom.
- Accept alternate spellings, common abbreviations, and reasonable phonetic matches.
- Accept partial names if they are unambiguous (e.g., "Einstein" for "Albert Einstein").
- Accept reasonable alternate answers that are factually equivalent.
- Ignore minor formatting differences (capitalization, articles like "the"/"a").
- If in doubt, rule in favor of the player.`;

  const user = `Clue (statement shown to players): "${clueAnswer}"
Expected correct response: "${correctQuestion}"
Player's answer: "${playerAnswer}"

Is the player's answer correct?

Return a JSON object:
{
  "correct": true or false,
  "explanation": "Brief reason for your ruling"
}`;

  return { system, user };
}

/**
 * Build prompt for judging a player's appeal after being marked incorrect.
 */
export function buildAppealPrompt(
  clueAnswer: string,
  correctQuestion: string,
  playerAnswer: string,
  appealArgument: string,
): { system: string; user: string } {
  const system = `You are the Supreme Appeals Judge of Brain Battle. You are fair, entertaining, and slightly theatrical.

Your responses MUST be valid JSON only. No markdown, no explanation, just JSON.

Appeal guidelines:
- You grant roughly 30% of appeals. You are fair but not a pushover.
- GRANT the appeal if: the player presents a genuinely valid alternate answer, makes a clever-but-logical argument, or identifies real ambiguity in the clue.
- DENY the appeal if: the argument is a stretch, relies on obscure technicalities with no real merit, or is just begging.
- When denying, do so with wit and style. Be entertaining, not mean.
- When granting, acknowledge the player's cleverness.
- Your reasoning should be 2-3 entertaining sentences that will be displayed on the TV screen for all players to enjoy.`;

  const user = `Clue (statement shown to players): "${clueAnswer}"
Expected correct response: "${correctQuestion}"
Player's original answer: "${playerAnswer}"
Player's appeal argument: "${appealArgument}"

Should this appeal be granted?

Return a JSON object:
{
  "granted": true or false,
  "reasoning": "Your entertaining judicial ruling in 2-3 sentences"
}`;

  return { system, user };
}
