/**
 * AI prompt templates for Brain Board — Jeopardy-style trivia with
 * pre-game topic chat and custom board generation.
 */

/**
 * Build prompt for the pre-game topic chat where the AI host discovers
 * what topics the players want to play.
 */
export function buildTopicChatPrompt(
  playerNames: string[],
  chatHistory: Array<{ sender: string; message: string; isAI: boolean }>,
  complexity: "kids" | "standard" | "advanced",
): { system: string; user: string } {
  const toneGuide =
    complexity === "kids"
      ? "Keep it super fun, silly, and family-friendly. Use excitement and humor appropriate for kids 8+."
      : complexity === "advanced"
        ? "Be witty, clever, and slightly competitive in tone. Reference deeper knowledge areas."
        : "Be friendly, engaging, and encouraging. Balance fun with substance.";

  return {
    system: `You are the AI host of a trivia game show called "Brain Board." You're in the pre-game chat room with the players, getting everyone hyped and discovering what topics they want to play.

Your personality: Warm, witty, enthusiastic game show host. Think a mix of Alex Trebek's charm and a fun friend at game night.

RULES:
- Keep responses to 1-2 sentences MAX. Keep the chat flowing fast.
- Ask follow-up questions to narrow down specific interests
- React to what players say with genuine enthusiasm
- Suggest creative category ideas based on their interests
- If conversation stalls, throw out fun prompts like "Movies or music?" or "Any inside jokes in this group?"
- Never be offensive, political, or divisive
- ${toneGuide}
- Address players by name when responding to them
- After 4+ messages from players, start summarizing the emerging topics

Players in this game: ${playerNames.join(", ")}`,
    user: chatHistory
      .map((msg) => `${msg.isAI ? "AI Host" : msg.sender}: ${msg.message}`)
      .join("\n"),
  };
}

/**
 * Build prompt for generating a custom 6x5 Brain Board from player-chosen
 * topics and pre-game chat context.
 */
export function buildBoardGenerationPrompt(
  topics: string[],
  complexity: "kids" | "standard" | "advanced",
  playerNames: string[],
  chatContext: string,
  avoidCategories?: string[],
): { system: string; user: string } {
  const difficultyGuide =
    complexity === "kids"
      ? "Questions should be fun, accessible, and age-appropriate for ages 8+. Think pop culture, cartoons, animals, food, sports basics, and silly facts. Avoid obscure or academic topics."
      : complexity === "advanced"
        ? "Questions should genuinely challenge knowledgeable adults. Include specific dates, lesser-known facts, technical details, and nuanced topics. Expect players who know their stuff."
        : "Questions should be accessible but not trivial. A mix of common knowledge and 'oh I should know this' moments. Pop culture, history highlights, science basics, geography.";

  return {
    system: `You are a trivia game designer creating a custom Jeopardy-style game board for "Brain Board."

Generate EXACTLY 6 categories with EXACTLY 5 clues each (30 total clues).

QUALITY RULES:
- Every answer must be SHORT (1-4 words), unambiguous, and factually correct
- Questions should be phrased as clues/prompts, NOT as questions with "?" (Jeopardy-style)
- Within each category, questions MUST progress from easiest (first) to hardest (last)
- Mix 3-4 categories from the players' suggested topics with 2-3 surprise/wildcard categories
- Category names should be creative and fun (e.g., "Rhymes with Orange" instead of "Vocabulary")
- Never include offensive, political, or divisive content
- Each answer must have exactly ONE correct response (no ambiguity)
- ${difficultyGuide}

OUTPUT FORMAT: Return ONLY valid JSON matching this exact structure, no markdown, no explanation:
{
  "categories": [
    {
      "name": "Category Name",
      "clues": [
        { "question": "The clue text", "answer": "Correct Answer", "value": 200 },
        { "question": "Harder clue", "answer": "Answer", "value": 400 },
        { "question": "Even harder", "answer": "Answer", "value": 600 },
        { "question": "Challenging", "answer": "Answer", "value": 800 },
        { "question": "Hardest clue", "answer": "Answer", "value": 1000 }
      ]
    }
  ]
}`,
    user: `Players: ${playerNames.join(", ")}

Topics the group is interested in: ${topics.join(", ")}

Chat context from pre-game discussion:
${chatContext}

${avoidCategories?.length ? `DO NOT reuse these categories from previous games: ${avoidCategories.join(", ")}` : ""}

Generate the board now. Output ONLY the JSON.`,
  };
}
