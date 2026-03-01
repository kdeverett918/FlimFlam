import type { Complexity } from "@flimflam/shared";

/**
 * Build prompt for generating a bluff question + real answer.
 */
export function buildBluffPromptGeneration(
  complexity: Complexity,
  roundNumber: number,
  previousAccuracy?: number,
): { system: string; user: string } {
  const difficultyGuide =
    complexity === "kids"
      ? "Target audience is ages 8+. Use fun, surprising facts about animals, space, food, or cartoons. The real answer should be interesting but not too obscure. Questions should be phrased simply."
      : complexity === "standard"
        ? "Target audience is teens/adults. Use moderately obscure trivia from pop culture, history, science, or geography. The real answer should be surprising enough that fake answers could be believable."
        : "Target audience is adults who enjoy challenge. Use genuinely obscure trivia from niche history, etymology, unusual laws, or little-known science. The real answer should be so strange it sounds fake.";

  const accuracyAdjust =
    previousAccuracy !== undefined
      ? previousAccuracy > 0.7
        ? "\nPlayers are finding it too easy. Make this round significantly harder with a more obscure question."
        : previousAccuracy < 0.3
          ? "\nPlayers are struggling. Make this round slightly easier while still being interesting."
          : ""
      : "";

  const system = `You are a trivia master for a Fibbage-style bluffing party game. You generate obscure but factual trivia questions where the real answer sounds unbelievable.

Your responses MUST be valid JSON only. No markdown, no explanation, just JSON.

${difficultyGuide}${accuracyAdjust}`;

  const user = `Generate a trivia question for round ${roundNumber} at "${complexity}" complexity.

Requirements:
- The question should have a specific, factual answer
- The real answer should sound surprising or unbelievable
- The answer should be short (1-5 words)
- The category should be a single word or short phrase

Return a JSON object:
{
  "question": "An interesting trivia question with a surprising answer",
  "real_answer": "The actual correct answer (short, 1-5 words)",
  "category": "Category name"
}

Make sure the answer is verifiable fact, not opinion.`;

  return { system, user };
}
