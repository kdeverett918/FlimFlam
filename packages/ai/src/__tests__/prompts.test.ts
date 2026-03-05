import type {
  HotTakePlayerProfile,
  HotTakeRoundHistory,
  RoundNarrationInput,
} from "@flimflam/shared";
import { buildBluffPromptGeneration } from "../prompts/bluff-engine";
import {
  buildAnswerJudgePrompt,
  buildAppealPrompt,
  buildBoardGenerationPrompt as buildBrainBattleBoardPrompt,
} from "../prompts/brain-battle";
import {
  buildBoardGenerationPrompt as buildBrainBoardPrompt,
  buildTopicChatPrompt,
} from "../prompts/brain-board";
import { buildHotTakeAdaptivePrompt, buildHotTakeInitialPrompt } from "../prompts/hot-take";
import { buildTriviaBatchPrompt } from "../prompts/reality-drift";
import {
  buildBonusJudgingPrompt,
  buildNarrationPrompt,
  buildScenarioPrompt,
} from "../prompts/world-builder";

describe("ai/prompts", () => {
  it("builds bluff prompt guidance for each complexity and adaptive difficulty", () => {
    const kids = buildBluffPromptGeneration("kids", 2, 0.2);
    const standard = buildBluffPromptGeneration("standard", 3, 0.5);
    const advanced = buildBluffPromptGeneration("advanced", 4, 0.9);

    expect(kids.system).toContain("ages 8+");
    expect(kids.system).toContain("slightly easier");
    expect(kids.user).toContain('round 2 at "kids" complexity');

    expect(standard.system).toContain("teens/adults");
    expect(standard.system).not.toContain("too easy");
    expect(standard.user).toContain('"real_answer"');

    expect(advanced.system).toContain("genuinely obscure trivia");
    expect(advanced.system).toContain("significantly harder");
    expect(advanced.user).toContain('"category"');
  });

  it("builds Brain Battle generation and judging prompts", () => {
    const board = buildBrainBattleBoardPrompt(["Movies", "History"], "advanced");
    const judge = buildAnswerJudgePrompt(
      "This scientist developed relativity.",
      "Who is Albert Einstein?",
      "Einstein",
    );
    const appeal = buildAppealPrompt(
      "This city is known as the Big Apple.",
      "What is New York City?",
      "New York",
      "The clue clearly allows this shorthand.",
    );

    expect(board.system).toContain("challenge");
    expect(board.user).toContain("Movies, History");
    expect(board.user).toContain('"categories"');

    expect(judge.system).toContain("lenient quiz judge");
    expect(judge.user).toContain("Player's answer");
    expect(judge.user).toContain('"correct"');

    expect(appeal.system).toContain("Supreme Appeals Judge");
    expect(appeal.user).toContain("appeal argument");
    expect(appeal.user).toContain('"granted"');
  });

  it("builds Brain Board topic-chat prompt with tone by complexity", () => {
    const history = [
      { sender: "Ava", message: "Let's do movie trivia", isAI: false },
      { sender: "AI Host", message: "Love that idea!", isAI: true },
    ];

    const kids = buildTopicChatPrompt(["Ava", "Kai"], history, "kids");
    const standard = buildTopicChatPrompt(["Ava", "Kai"], history, "standard");
    const advanced = buildTopicChatPrompt(["Ava", "Kai"], history, "advanced");

    expect(kids.system).toContain("family-friendly");
    expect(standard.system).toContain("friendly, engaging");
    expect(advanced.system).toContain("slightly competitive");

    expect(kids.system).toContain("Players in this game: Ava, Kai");
    expect(kids.user).toContain("Ava: Let's do movie trivia");
    expect(kids.user).toContain("AI Host: Love that idea!");
  });

  it("builds Brain Board generation prompt and applies avoidCategories branch", () => {
    const withAvoid = buildBrainBoardPrompt(
      ["Sports", "Cartoons"],
      "kids",
      ["Ava", "Kai"],
      "Players want quick rounds.",
      ["Old Category"],
    );
    const withoutAvoid = buildBrainBoardPrompt(
      ["Tech", "History"],
      "standard",
      ["Mina", "Jules"],
      "Group likes medium difficulty.",
    );

    expect(withAvoid.system).toContain("age-appropriate for ages 8+");
    expect(withAvoid.user).toContain("CRITICAL: Do NOT reuse");
    expect(withoutAvoid.system).toContain("accessible but not trivial");
    expect(withoutAvoid.user).not.toContain("CRITICAL: Do NOT reuse");
  });

  it("builds Hot Take initial prompt with and without submitted profiles", () => {
    const profiles: HotTakePlayerProfile[] = [
      { sessionId: "alex", name: "Alex", topic: "Sports", category: "hobbies" },
      { sessionId: "nia", name: "Nia", topic: "Movies", category: "entertainment" },
    ];

    const withProfiles = buildHotTakeInitialPrompt("advanced", profiles, 6);
    const noProfiles = buildHotTakeInitialPrompt("kids", [], 4);

    expect(withProfiles.system).toContain("adults who enjoy debate");
    expect(withProfiles.user).toContain('Alex: "Sports" (category: hobbies)');
    expect(withProfiles.user).toContain("Generate 6 hot take statements");

    expect(noProfiles.system).toContain("ages 8+");
    expect(noProfiles.user).toContain("No topics submitted");
  });

  it("builds Hot Take adaptive prompt with history and fallback text", () => {
    const profiles: HotTakePlayerProfile[] = [
      { sessionId: "remy", name: "Remy", topic: "Music", category: "arts" },
    ];
    const history: HotTakeRoundHistory[] = [
      {
        round: 1,
        statement: "Pineapple belongs on pizza.",
        votes: new Map([
          ["a", 1],
          ["b", 5],
        ]),
        median: 3,
        spread: 4,
        wasUnanimous: false,
        wasPolarized: true,
      },
    ];

    const withHistory = buildHotTakeAdaptivePrompt("standard", profiles, history, 3);
    const empty = buildHotTakeAdaptivePrompt("advanced", [], [], 2);

    expect(withHistory.system).toContain("teens/adults");
    expect(withHistory.user).toContain("POLARIZED");
    expect(withHistory.user).toContain('"escalation_level": 4');
    expect(withHistory.user).toContain("Remaining rounds: 3");

    expect(empty.user).toContain("No topic profiles available.");
    expect(empty.user).toContain("No previous rounds yet.");
  });

  it("builds Reality Drift prompt with optional topic targeting", () => {
    const withTopics = buildTriviaBatchPrompt("standard", 7, 2, ["AI", "Robotics"]);
    const withoutTopics = buildTriviaBatchPrompt("kids", 5, 1);

    expect(withTopics.user).toContain("7 headline rounds: 5 REAL and 2 DRIFT");
    expect(withTopics.user).toContain("Focus on these topics: AI, Robotics.");
    expect(withTopics.system).toContain("teens/adults");

    expect(withoutTopics.user).toContain("Cover a diverse range of topics.");
    expect(withoutTopics.system).toContain("ages 8+");
  });

  it("builds World Builder prompts for scenario, narration, and bonus judging", () => {
    const scenarioKids = buildScenarioPrompt(2, "kids");
    const scenarioStandard = buildScenarioPrompt(3, "standard");
    const scenarioAdvanced = buildScenarioPrompt(4, "advanced");

    expect(scenarioKids.system).toContain("safe for ages 8+");
    expect(scenarioStandard.system).toContain("PG-13");
    expect(scenarioAdvanced.system).toContain("political intrigue");
    expect(scenarioAdvanced.user).toContain('"roles"');

    const narrationInput: RoundNarrationInput = {
      round: 3,
      totalRounds: 3,
      scenario: {
        setting: "Floating city",
        situation: "Storm is closing in",
        worldState: {
          location: "Sky Harbor",
          timePressure: "One hour before collapse",
          keyResources: ["fuel", "maps"],
          npcs: [{ name: "Kora", role: "Pilot", disposition: "neutral" }],
          threats: ["power outage"],
          opportunities: ["secret tunnel"],
        },
        roles: [
          {
            roleName: "Scout",
            publicIdentity: "Fast mover",
            secretObjective: "Find the hidden route",
            specialAbility: "Dash",
            scoringCriteria: "Discover intel",
          },
          {
            roleName: "Engineer",
            publicIdentity: "Systems fixer",
            secretObjective: "Stabilize reactor",
            specialAbility: "Bypass",
            scoringCriteria: "Restore power",
          },
        ],
        tone: "adventurous",
      },
      worldState: {
        location: "Sky Harbor",
        timePressure: "One hour before collapse",
        keyResources: ["fuel", "maps"],
        npcs: [{ name: "Kora", role: "Pilot", disposition: "neutral" }],
        threats: ["power outage"],
        opportunities: ["secret tunnel"],
      },
      playerActions: [
        { sessionId: "a", name: "Ava", role: "Scout", action: "Secure the tunnel." },
        { sessionId: "b", name: "Kai", role: "Engineer", action: "Repair backup power." },
      ],
      previousNarrations: ["The team escaped the docks.", "A rival group gave chase."],
    };

    const narration = buildNarrationPrompt(narrationInput, []);
    expect(narration.user).toContain("Previous events:");
    expect(narration.user).toContain('"dramatic_twist"');
    expect(narration.user).toContain('"session_id": "a"');

    const earlyRoundNarration = buildNarrationPrompt(
      {
        ...narrationInput,
        round: 1,
        previousNarrations: [],
      },
      [],
    );
    expect(earlyRoundNarration.user).not.toContain("Previous events:");
    expect(earlyRoundNarration.user).not.toContain('"dramatic_twist"');

    const bonus = buildBonusJudgingPrompt({
      scenario: { setting: "Ruined moon base", situation: "Air is running out" },
      rounds: [
        {
          narration: "They stabilized life support.",
          actions: [
            { sessionId: "a", name: "Ava", action: "Seal the hull breach." },
            { sessionId: "b", name: "Kai", action: "Reroute power." },
          ],
        },
      ],
    });
    expect(bonus.user).toContain('"best_action"');
    expect(bonus.user).toContain('"a": "Ava"');
    expect(bonus.user).toContain('"b": "Kai"');
  });
});
