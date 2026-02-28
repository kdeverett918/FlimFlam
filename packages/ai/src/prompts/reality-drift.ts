import type { Complexity } from "@partyline/shared";

/**
 * Build prompt for generating a batch of trivia questions, some of which are "drift" (fake).
 */
export function buildTriviaBatchPrompt(
  complexity: Complexity,
  roundCount: number,
  driftCount: number,
  targetTopics?: string[],
): { system: string; user: string } {
  const realCount = roundCount - driftCount;

  const difficultyGuide =
    complexity === "kids"
      ? "Target audience is ages 8+. Use fun facts about animals, space, food, sports, or cartoons. Keep language simple and answers obvious to someone who knows the subject. Drift questions should be absurd enough for kids to catch."
      : complexity === "standard"
        ? "Target audience is teens/adults. Use general knowledge across science, history, geography, pop culture, and current events. Drift questions should be plausible but subtly wrong."
        : "Target audience is knowledgeable adults. Use advanced trivia from specialized fields. Drift questions should be expertly crafted to be extremely difficult to distinguish from real facts.";

  const topicGuide =
    targetTopics && targetTopics.length > 0
      ? `Focus on these topics: ${targetTopics.join(", ")}.`
      : "Cover a diverse range of topics.";

  const system = `You are a trivia generator for a "Reality Drift" game where players must identify which trivia questions are real and which are completely fabricated.

Your responses MUST be valid JSON only. No markdown, no explanation, just JSON.

${difficultyGuide}`;

  const user = `Generate a batch of ${roundCount} trivia questions: ${realCount} real and ${driftCount} fake ("drift").

${topicGuide}

For REAL questions:
- Must be verifiably true facts
- Include 4 options with exactly 1 correct answer
- The correct answer must be included in the options array

For DRIFT questions:
- The entire question is fabricated (the "fact" doesn't exist)
- Still include 4 plausible-sounding options
- Mark one as "correct" for consistency
- The question should sound believable

Return a JSON object:
{
  "questions": [
    {
      "question": "What is the actual trivia question?",
      "correct_answer": "The correct option text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "is_drift": false,
      "category": "Science"
    }
  ]
}

Mix the real and drift questions randomly. Do NOT group them. Ensure options are shuffled so the correct answer is not always in the same position.`;

  return { system, user };
}
