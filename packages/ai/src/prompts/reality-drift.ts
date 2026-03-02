import type { Complexity } from "@flimflam/shared";

/**
 * Build prompt for generating a batch of headline-style rounds (Headline or Hallucination),
 * some of which are "drift" (fabricated).
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
      ? "Target audience is ages 8+. Use playful, simple headline-style prompts about animals, space, food, sports, games, or silly internet trends. Keep vocabulary simple. Drift headlines should be goofy enough for kids to catch."
      : complexity === "standard"
        ? "Target audience is teens/adults. Use headline-style prompts across social trends, startups, tech, science, and culture. Drift headlines should be plausible but subtly wrong."
        : "Target audience is knowledgeable adults. Use nuanced headline-style prompts across specialized tech/science and cultural trends. Drift headlines should be expertly crafted to be difficult to distinguish from real ones.";

  const topicGuide =
    targetTopics && targetTopics.length > 0
      ? `Focus on these topics: ${targetTopics.join(", ")}.`
      : "Cover a diverse range of topics.";

  const system = `You are a headline-style round generator for a party game called "Reality Drift" (a.k.a. "Headline or Hallucination").

Players see a headline with ONE missing key detail, pick the correct fill from 4 options, then decide whether the headline is REAL (based on a real-world fact) or DRIFT (fully fabricated).

Your responses MUST be valid JSON only. No markdown, no explanation, just JSON.

Safety requirements:
- Do not include hate/harassment, sexual content, self-harm, or instructions for wrongdoing.
- Avoid real-person allegations, defamation, or doxxing-style details.
- Avoid real-world tragedies, graphic violence, or extremist content.
- Avoid medical/legal/financial advice.
- Prefer fictional company names for startups; if mentioning real companies, keep it neutral and non-defamatory.
- For "conspiracy posts", keep them harmless and clearly non-actionable; do NOT echo real harmful conspiracies.

${difficultyGuide}`;

  const user = `Generate a batch of ${roundCount} headline rounds: ${realCount} REAL and ${driftCount} DRIFT.

${topicGuide}

For EVERY round:
- The "question" field must be a punchy headline-style sentence (not a question).
- The headline must contain EXACTLY ONE blank represented by "_____" (five underscores).
- Provide 4 unique options (short: 1–5 words) that could fill the blank.
- Exactly 1 option is the correct answer. Put it in "correct_answer" and include it verbatim in the options array.
- Shuffle options so the correct answer isn't always the same position.
- Keep categories to one of: "Social Trend", "Startup Launch", "Conspiracy Post", "Science Breakthrough", "Tech".

For REAL rounds:
- Base the headline on a widely-known, verifiable public fact (no need to cite sources or dates).
- Avoid ultra-niche claims that players couldn't reasonably know.

For DRIFT rounds:
- The entire headline premise is fabricated, but must sound plausible.
- Still include a blank and a "correct" option for consistency.
- Do NOT make drift headlines about real people, or about serious harm.

Return a JSON object:
{
  "questions": [
    {
      "question": "Startup claims it's replacing passwords with _____",
      "correct_answer": "Passkeys",
      "options": ["Passkeys", "QR wallets", "Voiceprints", "Mood rings"],
      "is_drift": false,
      "category": "Tech"
    }
  ]
}

Mix the real and drift rounds randomly. Do NOT group them.`;

  return { system, user };
}
