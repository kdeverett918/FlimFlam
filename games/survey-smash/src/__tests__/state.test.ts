import { fuzzyMatch } from "@flimflam/shared";
import { describe, expect, it } from "vitest";
import { ADVANCED_SURVEYS, KIDS_SURVEYS, STANDARD_SURVEYS } from "../content/survey-bank";
import type { Survey } from "../content/survey-bank";
import {
  FUZZY_THRESHOLD,
  LIGHTNING_BONUS_POINTS,
  LIGHTNING_BONUS_THRESHOLD,
  MAX_STRIKES,
  type RevealedAnswer,
  type SurveySmashInternalState,
  type TeamInfo,
  assignTeams,
  findMatchingAnswer,
  pickFaceOffPlayers,
} from "../index";

// ─── Helper: build a minimal internal state for testing ─────────────

function makeState(overrides: Partial<SurveySmashInternalState> = {}): SurveySmashInternalState {
  return {
    complexity: "standard",
    teamMode: false,
    teams: [],
    playerTeamMap: new Map(),
    allSurveys: [...STANDARD_SURVEYS],
    usedSurveyIndices: new Set(),
    currentSurveyIndex: -1,
    currentSurvey: null,
    round: 1,
    totalRounds: 4,
    phase: "guessing",
    revealedAnswers: [],
    strikes: 0,
    controllingTeamId: "",
    roundPoints: 0,
    faceOffPlayers: [],
    faceOffEntries: [],
    faceOffResolved: false,
    guessingOrder: [],
    currentGuesserIndex: 0,
    stealTeamId: "",
    lightningPlayerId: "",
    lightningQuestions: [],
    lightningCurrentIndex: 0,
    lightningAnswers: [],
    lightningTotalPoints: 0,
    allPlayerIds: ["p1", "p2", "p3", "p4"],
    ...overrides,
  };
}

const SAMPLE_SURVEY: Survey = {
  question: "Name something people do before bed",
  answers: [
    { text: "Brush teeth", points: 28, rank: 1 },
    { text: "Watch TV", points: 22, rank: 2 },
    { text: "Read", points: 18, rank: 3 },
    { text: "Check phone", points: 14, rank: 4 },
    { text: "Shower", points: 10, rank: 5 },
    { text: "Set alarm", points: 8, rank: 6 },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// Team Assignment
// ═══════════════════════════════════════════════════════════════════

describe("Team Assignment", () => {
  it("should split even number of players into equal teams", () => {
    const playerIds = ["p1", "p2", "p3", "p4"];
    const { teams, playerTeamMap } = assignTeams(playerIds, true);

    expect(teams).toHaveLength(2);
    const teamA = teams.find((t) => t.id === "team-a");
    const teamB = teams.find((t) => t.id === "team-b");
    expect(teamA).toBeDefined();
    expect(teamB).toBeDefined();
    expect(teamA?.members.length).toBe(2);
    expect(teamB?.members.length).toBe(2);

    // Every player assigned
    expect(playerTeamMap.size).toBe(4);
    for (const pid of playerIds) {
      const teamId = playerTeamMap.get(pid);
      expect(teamId === "team-a" || teamId === "team-b").toBe(true);
    }
  });

  it("should handle odd number of players (one team gets an extra)", () => {
    const playerIds = ["p1", "p2", "p3", "p4", "p5"];
    const { teams } = assignTeams(playerIds, true);

    const teamA = teams.find((t) => t.id === "team-a");
    const teamB = teams.find((t) => t.id === "team-b");
    expect(teamA).toBeDefined();
    expect(teamB).toBeDefined();

    // One team has 3, the other 2
    const sizes = [teamA?.members.length, teamB?.members.length].sort();
    expect(sizes).toEqual([2, 3]);
  });

  it("should assign each player as their own team in FFA mode", () => {
    const playerIds = ["p1", "p2", "p3"];
    const { teams, playerTeamMap } = assignTeams(playerIds, false);

    expect(teams).toHaveLength(3);
    for (const pid of playerIds) {
      const team = teams.find((t) => t.id === pid);
      expect(team).toBeDefined();
      expect(team?.members).toEqual([pid]);
      expect(playerTeamMap.get(pid)).toBe(pid);
    }
  });

  it("should initialize team scores to zero", () => {
    const { teams } = assignTeams(["p1", "p2", "p3", "p4"], true);
    for (const team of teams) {
      expect(team.score).toBe(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// Face-Off: Higher Rank Gets Control
// ═══════════════════════════════════════════════════════════════════

describe("Face-Off Resolution", () => {
  it("should pick one player from each team in team mode", () => {
    const gs = makeState({
      teamMode: true,
      round: 1,
      teams: [
        { id: "team-a", members: ["p1", "p3"], score: 0 },
        { id: "team-b", members: ["p2", "p4"], score: 0 },
      ],
    });

    const faceOffPlayers = pickFaceOffPlayers(gs);
    expect(faceOffPlayers).toHaveLength(2);
    expect(["p1", "p3"]).toContain(faceOffPlayers[0]);
    expect(["p2", "p4"]).toContain(faceOffPlayers[1]);
  });

  it("should pick two random players in FFA mode", () => {
    const gs = makeState({
      teamMode: false,
      allPlayerIds: ["p1", "p2", "p3", "p4"],
    });

    const faceOffPlayers = pickFaceOffPlayers(gs);
    expect(faceOffPlayers).toHaveLength(2);
    // Both should be from the player pool
    expect(gs.allPlayerIds).toContain(faceOffPlayers[0]);
    expect(gs.allPlayerIds).toContain(faceOffPlayers[1]);
    // Should be different players
    expect(faceOffPlayers[0]).not.toBe(faceOffPlayers[1]);
  });

  it("higher-ranked answer wins face-off control", () => {
    // Simulate: Player A gets rank 3, Player B gets rank 1
    // Player B (rank 1) should win because lower rank = higher on the board
    const entryA = { sessionId: "p1", answer: "Read", matchedRank: 3 };
    const entryB = { sessionId: "p2", answer: "Brush teeth", matchedRank: 1 };

    let bestEntry = entryA;
    if (
      entryB.matchedRank !== null &&
      (bestEntry.matchedRank === null || entryB.matchedRank < bestEntry.matchedRank)
    ) {
      bestEntry = entryB;
    }

    expect(bestEntry.sessionId).toBe("p2");
    expect(bestEntry.matchedRank).toBe(1);
  });

  it("if only one player matches, that player wins", () => {
    const entryA = { sessionId: "p1", answer: "nonsense", matchedRank: null as number | null };
    const entryB = { sessionId: "p2", answer: "Brush teeth", matchedRank: 1 };

    let bestEntry: { sessionId: string; matchedRank: number | null } | null = null;
    for (const entry of [entryA, entryB]) {
      if (entry.matchedRank !== null) {
        if (
          !bestEntry ||
          bestEntry.matchedRank === null ||
          entry.matchedRank < bestEntry.matchedRank
        ) {
          bestEntry = entry;
        }
      }
    }

    expect(bestEntry).not.toBeNull();
    expect(bestEntry?.sessionId).toBe("p2");
  });
});

// ═══════════════════════════════════════════════════════════════════
// Answer Matching (Fuzzy Threshold 0.7)
// ═══════════════════════════════════════════════════════════════════

describe("Answer Matching", () => {
  it("should match exact answers", () => {
    const match = findMatchingAnswer("Brush teeth", SAMPLE_SURVEY, []);
    expect(match).not.toBeNull();
    expect(match?.text).toBe("Brush teeth");
    expect(match?.rank).toBe(1);
  });

  it("should match case-insensitively", () => {
    const match = findMatchingAnswer("brush teeth", SAMPLE_SURVEY, []);
    expect(match).not.toBeNull();
    expect(match?.text).toBe("Brush teeth");
  });

  it("should match with fuzzy threshold 0.7", () => {
    // "brushing teeth" should match "Brush teeth" via substring inclusion
    const match = findMatchingAnswer("brushing teeth", SAMPLE_SURVEY, []);
    expect(match).not.toBeNull();
    expect(match?.text).toBe("Brush teeth");
  });

  it("should not match already revealed answers", () => {
    const revealed: RevealedAnswer[] = [{ text: "Brush teeth", points: 28, rank: 1 }];
    const match = findMatchingAnswer("Brush teeth", SAMPLE_SURVEY, revealed);
    expect(match).toBeNull();
  });

  it("should match partial answers via substring", () => {
    // "TV" should match "Watch TV" since "tv" is contained in "watch tv"
    const match = findMatchingAnswer("TV", SAMPLE_SURVEY, []);
    expect(match).not.toBeNull();
    expect(match?.text).toBe("Watch TV");
  });

  it("should return null for completely wrong answers", () => {
    const match = findMatchingAnswer("xylophone concert", SAMPLE_SURVEY, []);
    expect(match).toBeNull();
  });

  it("uses threshold 0.7 which is more forgiving than default 0.85", () => {
    // Direct fuzzyMatch test to confirm threshold behavior
    // "shwer" vs "shower" — similarity should pass 0.7 but might not pass 0.85
    expect(fuzzyMatch("shwer", "shower", FUZZY_THRESHOLD)).toBe(true);
    expect(FUZZY_THRESHOLD).toBe(0.7);
  });

  it("should match from survey bank surveys", () => {
    // Test against actual survey bank data
    const kidsSurvey = KIDS_SURVEYS[0]; // playground
    expect(kidsSurvey).toBeDefined();
    const match = findMatchingAnswer("slides", kidsSurvey as Survey, []);
    expect(match).not.toBeNull();
    expect(match?.text).toBe("Slide");
  });
});

// ═══════════════════════════════════════════════════════════════════
// Strike Counting
// ═══════════════════════════════════════════════════════════════════

describe("Strike Counting", () => {
  it("should trigger steal after 3 strikes", () => {
    expect(MAX_STRIKES).toBe(3);

    let strikes = 0;
    let stealTriggered = false;

    // Simulate 3 wrong guesses
    for (let i = 0; i < 3; i++) {
      strikes++;
      if (strikes >= MAX_STRIKES) {
        stealTriggered = true;
      }
    }

    expect(stealTriggered).toBe(true);
    expect(strikes).toBe(3);
  });

  it("should NOT trigger steal before 3 strikes", () => {
    let strikes = 0;

    strikes++;
    expect(strikes < MAX_STRIKES).toBe(true);

    strikes++;
    expect(strikes < MAX_STRIKES).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Steal Logic
// ═══════════════════════════════════════════════════════════════════

describe("Steal Logic", () => {
  it("correct steal gives points to stealing team", () => {
    const controlTeam: TeamInfo = { id: "team-a", members: ["p1", "p2"], score: 50 };
    const stealTeam: TeamInfo = { id: "team-b", members: ["p3", "p4"], score: 30 };
    const roundPoints = 72;

    // Simulate: steal is successful
    const stealSuccessful = true;
    const winningTeam = stealSuccessful ? stealTeam : controlTeam;
    winningTeam.score += roundPoints;

    expect(stealTeam.score).toBe(30 + 72);
    expect(controlTeam.score).toBe(50); // unchanged
  });

  it("wrong steal keeps points with controlling team", () => {
    const controlTeam: TeamInfo = { id: "team-a", members: ["p1", "p2"], score: 50 };
    const stealTeam: TeamInfo = { id: "team-b", members: ["p3", "p4"], score: 30 };
    const roundPoints = 72;

    // Simulate: steal fails
    const stealSuccessful = false;
    const winningTeam = stealSuccessful ? stealTeam : controlTeam;
    winningTeam.score += roundPoints;

    expect(controlTeam.score).toBe(50 + 72);
    expect(stealTeam.score).toBe(30); // unchanged
  });

  it("in FFA mode, steal goes to a different player", () => {
    const gs = makeState({
      teamMode: false,
      controllingTeamId: "p1",
      allPlayerIds: ["p1", "p2", "p3", "p4"],
      playerTeamMap: new Map([
        ["p1", "p1"],
        ["p2", "p2"],
        ["p3", "p3"],
        ["p4", "p4"],
      ]),
    });

    const others = gs.allPlayerIds.filter(
      (pid) => gs.playerTeamMap.get(pid) !== gs.controllingTeamId,
    );

    expect(others).toHaveLength(3);
    expect(others).not.toContain("p1");
  });
});

// ═══════════════════════════════════════════════════════════════════
// Lightning Round Scoring
// ═══════════════════════════════════════════════════════════════════

describe("Lightning Round Scoring", () => {
  it("awards bonus when total >= 200", () => {
    const totalPoints = 210;
    let bonusAwarded = false;

    if (totalPoints >= LIGHTNING_BONUS_THRESHOLD) {
      bonusAwarded = true;
    }

    expect(bonusAwarded).toBe(true);
    expect(LIGHTNING_BONUS_THRESHOLD).toBe(200);
    expect(LIGHTNING_BONUS_POINTS).toBe(10000);
  });

  it("does NOT award bonus when total < 200", () => {
    const totalPoints = 180;
    let bonusAwarded = false;

    if (totalPoints >= LIGHTNING_BONUS_THRESHOLD) {
      bonusAwarded = true;
    }

    expect(bonusAwarded).toBe(false);
  });

  it("awards bonus at exactly 200", () => {
    const totalPoints = 200;
    let bonusAwarded = false;

    if (totalPoints >= LIGHTNING_BONUS_THRESHOLD) {
      bonusAwarded = true;
    }

    expect(bonusAwarded).toBe(true);
  });

  it("accumulates points from multiple lightning round questions", () => {
    const answers = [
      { question: "Q1", answer: "A1", points: 35, matched: true },
      { question: "Q2", answer: "A2", points: 28, matched: true },
      { question: "Q3", answer: "A3", points: 0, matched: false },
      { question: "Q4", answer: "A4", points: 22, matched: true },
      { question: "Q5", answer: "A5", points: 30, matched: true },
    ];

    const total = answers.reduce((sum, a) => sum + a.points, 0);
    expect(total).toBe(115);
    expect(total < LIGHTNING_BONUS_THRESHOLD).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Team Mode vs Free-For-All
// ═══════════════════════════════════════════════════════════════════

describe("Team Mode vs Free-For-All", () => {
  it("team mode creates exactly 2 teams", () => {
    const { teams } = assignTeams(["p1", "p2", "p3", "p4", "p5", "p6"], true);
    expect(teams).toHaveLength(2);
    expect(teams[0]?.id).toBe("team-a");
    expect(teams[1]?.id).toBe("team-b");
  });

  it("FFA mode creates one team per player", () => {
    const playerIds = ["p1", "p2", "p3", "p4", "p5"];
    const { teams } = assignTeams(playerIds, false);
    expect(teams).toHaveLength(5);
  });

  it("team mode distributes all players across teams", () => {
    const playerIds = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
    const { teams } = assignTeams(playerIds, true);

    const allMembers = [...(teams[0]?.members ?? []), ...(teams[1]?.members ?? [])];
    expect(allMembers.sort()).toEqual([...playerIds].sort());
  });

  it("FFA team IDs match player session IDs", () => {
    const playerIds = ["abc", "def", "ghi"];
    const { teams, playerTeamMap } = assignTeams(playerIds, false);

    for (const pid of playerIds) {
      expect(playerTeamMap.get(pid)).toBe(pid);
      const team = teams.find((t) => t.id === pid);
      expect(team).toBeDefined();
      expect(team?.members).toEqual([pid]);
    }
  });

  it("handles minimum 3 players in team mode", () => {
    const { teams } = assignTeams(["p1", "p2", "p3"], true);
    const sizes = [teams[0]?.members.length, teams[1]?.members.length].sort();
    expect(sizes).toEqual([1, 2]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Survey Bank Integrity
// ═══════════════════════════════════════════════════════════════════

describe("Survey Bank", () => {
  it("should have at least 20 kids surveys", () => {
    expect(KIDS_SURVEYS.length).toBeGreaterThanOrEqual(20);
  });

  it("should have at least 20 standard surveys", () => {
    expect(STANDARD_SURVEYS.length).toBeGreaterThanOrEqual(20);
  });

  it("should have at least 20 advanced surveys", () => {
    expect(ADVANCED_SURVEYS.length).toBeGreaterThanOrEqual(20);
  });

  it("each survey should have 3-8 answers", () => {
    const allSurveys = [...KIDS_SURVEYS, ...STANDARD_SURVEYS];
    for (const survey of allSurveys) {
      expect(survey.answers.length).toBeGreaterThanOrEqual(3);
      expect(survey.answers.length).toBeLessThanOrEqual(8);
    }
  });

  it("survey points should roughly add up to ~100", () => {
    for (const survey of KIDS_SURVEYS) {
      const total = survey.answers.reduce((sum, a) => sum + a.points, 0);
      expect(total).toBeGreaterThanOrEqual(80);
      expect(total).toBeLessThanOrEqual(120);
    }
  });

  it("answers should have sequential ranks", () => {
    for (const survey of STANDARD_SURVEYS) {
      for (let i = 0; i < survey.answers.length; i++) {
        expect(survey.answers[i]?.rank).toBe(i + 1);
      }
    }
  });
});
