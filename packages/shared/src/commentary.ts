/**
 * Dynamic Commentary Engine
 *
 * Generates contextual flavor text for game show moments.
 * Used by host components during transitions and results.
 */

import { pickRandom } from "./utils/random";

// ─── Commentary Templates ───────────────────────────────────────────

const STREAK_LINES: Record<number, string[]> = {
  2: ["{name} is on a roll!", "Two in a row for {name}!"],
  3: ["{name} is on FIRE!", "Three-peat for {name}!", "Unstoppable {name}!"],
  4: [
    "{name} can't be stopped!",
    "Four in a row — {name} is dominating!",
    "Is anyone gonna slow {name} down?!",
  ],
  5: [
    "{name} is absolutely CRUSHING it!",
    "Five straight for {name}! Legendary!",
    "Nobody can touch {name} right now!",
  ],
};

const COMEBACK_LINES = [
  "The comeback is ON!",
  "{name} is clawing their way back!",
  "Don't count {name} out just yet!",
  "{name} just pulled off a comeback!",
  "From the bottom to the top — {name}!",
];

const CLOSE_GAME_LINES = [
  "It's anyone's game!",
  "This is going down to the wire!",
  "You could cut the tension with a knife!",
  "Neck and neck — who's gonna pull ahead?",
  "Every point matters now!",
];

const BLOWOUT_LINES = [
  "{name} is running away with it!",
  "Can anyone catch {name}?",
  "{name} has built a MASSIVE lead!",
];

const LAST_ROUND_LINES = [
  "FINAL ROUND — make it count!",
  "Last chance to make your mark!",
  "Everything comes down to this!",
  "This is it — the final showdown!",
];

const CORRECT_ANSWER_LINES = [
  "Nailed it!",
  "Got it!",
  "That's the one!",
  "Spot on!",
  "Bingo!",
  "Right on the money!",
];

const WRONG_ANSWER_LINES = [
  "Not quite!",
  "So close!",
  "Ooh, tough break!",
  "Better luck next time!",
];

// ─── Commentary Functions ──────────────────────────────────────────

export function getStreakCommentary(name: string, streak: number): string | null {
  const cap = Math.min(streak, 5);
  const lines = STREAK_LINES[cap];
  if (!lines || lines.length === 0) return null;
  const line = pickRandom(lines) ?? lines[0] ?? "";
  return line.replace("{name}", name);
}

export function getComebackCommentary(name: string): string {
  const line = pickRandom(COMEBACK_LINES) ?? COMEBACK_LINES[0] ?? "";
  return line.replace("{name}", name);
}

export function getCloseGameCommentary(): string {
  return pickRandom(CLOSE_GAME_LINES) ?? "It's anyone's game!";
}

export function getBlowoutCommentary(leaderName: string): string {
  const line = pickRandom(BLOWOUT_LINES) ?? BLOWOUT_LINES[0] ?? "";
  return line.replace("{name}", leaderName);
}

export function getLastRoundCommentary(): string {
  return pickRandom(LAST_ROUND_LINES) ?? LAST_ROUND_LINES[0] ?? "";
}

export function getCorrectCommentary(): string {
  return pickRandom(CORRECT_ANSWER_LINES) ?? "Correct!";
}

export function getWrongCommentary(): string {
  return pickRandom(WRONG_ANSWER_LINES) ?? "Wrong!";
}

// ─── Game Situation Analysis ───────────────────────────────────────

interface StandingEntry {
  name: string;
  score: number;
}

/**
 * Analyze game standings and return the most dramatic commentary line.
 */
export function analyzeGameState(standings: StandingEntry[], isLastRound: boolean): string | null {
  if (standings.length < 2) return null;

  const sorted = [...standings].sort((a, b) => b.score - a.score);
  const leader = sorted[0];
  const second = sorted[1];
  if (!leader || !second) return null;

  if (isLastRound) {
    return getLastRoundCommentary();
  }

  const gap = leader.score - second.score;
  const total = leader.score + second.score;

  // Close game: within 10% of combined score
  if (total > 0 && gap / total < 0.1) {
    return getCloseGameCommentary();
  }

  // Blowout: leader has 2x the second place score
  if (second.score > 0 && leader.score >= second.score * 2) {
    return getBlowoutCommentary(leader.name);
  }

  return null;
}

// ─── Awards ────────────────────────────────────────────────────────

export interface GameAward {
  title: string;
  recipient: string;
  description: string;
}

interface AwardCandidate {
  name: string;
  sessionId: string;
  score: number;
  correctCount: number;
  fastestAnswer?: number;
  comebackSize?: number;
  streakMax?: number;
}

/**
 * Generate end-of-game awards from player performance data.
 * Returns 2-4 awards, always starting with the winner.
 */
export function generateAwards(candidates: AwardCandidate[], gameId: string): GameAward[] {
  if (candidates.length === 0) return [];

  const awards: GameAward[] = [];
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  if (!winner) return [];

  // Winner award
  awards.push({
    title: "Champion",
    recipient: winner.name,
    description: `${winner.score.toLocaleString()} pts`,
  });

  // Speed Demon: fastest average answer time
  const withFastest = candidates.filter(
    (c) => c.fastestAnswer !== undefined && c.fastestAnswer > 0,
  );
  if (withFastest.length > 0) {
    const fastest = withFastest.sort((a, b) => (a.fastestAnswer ?? 0) - (b.fastestAnswer ?? 0))[0];
    if (fastest && fastest.sessionId !== winner.sessionId) {
      awards.push({
        title: "Speed Demon",
        recipient: fastest.name,
        description: "Fastest answers",
      });
    }
  }

  // Come From Behind: biggest comeback
  const withComeback = candidates.filter((c) => c.comebackSize !== undefined && c.comebackSize > 0);
  if (withComeback.length > 0) {
    const biggestComeback = withComeback.sort(
      (a, b) => (b.comebackSize ?? 0) - (a.comebackSize ?? 0),
    )[0];
    if (biggestComeback && biggestComeback.sessionId !== winner.sessionId) {
      awards.push({
        title: "Come From Behind",
        recipient: biggestComeback.name,
        description: "Biggest comeback",
      });
    }
  }

  // Hot Streak: longest streak
  const withStreak = candidates.filter((c) => c.streakMax !== undefined && c.streakMax >= 3);
  if (withStreak.length > 0) {
    const longestStreak = withStreak.sort((a, b) => (b.streakMax ?? 0) - (a.streakMax ?? 0))[0];
    if (longestStreak) {
      awards.push({
        title: "Hot Streak",
        recipient: longestStreak.name,
        description: `${longestStreak.streakMax} in a row`,
      });
    }
  }

  // Steady Eddie: most consistent (most correct answers regardless of score)
  const mostCorrect = [...candidates].sort((a, b) => b.correctCount - a.correctCount)[0];
  if (
    mostCorrect &&
    mostCorrect.sessionId !== winner.sessionId &&
    mostCorrect.correctCount > 0 &&
    awards.length < 4
  ) {
    awards.push({
      title: "Steady Eddie",
      recipient: mostCorrect.name,
      description: `${mostCorrect.correctCount} correct`,
    });
  }

  // Game-specific award
  if (gameId === "lucky-letters" && awards.length < 4) {
    // Letter Luck: random fun award for Lucky Letters
    const nonWinner = sorted.filter((c) => c.sessionId !== winner.sessionId);
    if (nonWinner.length > 0 && nonWinner[0]) {
      const lucky = pickRandom(nonWinner) ?? nonWinner[0];
      awards.push({
        title: "Letter Luck",
        recipient: lucky.name,
        description: "Best vibes",
      });
    }
  }

  return awards.slice(0, 4);
}
