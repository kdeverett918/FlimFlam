import type { ScoreEntry } from "@partyline/shared";

interface RoundScore {
  round: number;
  points: number;
  reason: string;
}

interface BonusScore {
  points: number;
  reason: string;
}

interface PlayerScore {
  sessionId: string;
  name: string;
  roundScores: RoundScore[];
  bonuses: BonusScore[];
  totalPoints: number;
}

export class ScoringEngine {
  private players: Map<string, PlayerScore> = new Map();
  private kidsMode = false;

  constructor(kidsMode = false) {
    this.kidsMode = kidsMode;
  }

  initPlayer(sessionId: string, name: string): void {
    this.players.set(sessionId, {
      sessionId,
      name,
      roundScores: [],
      bonuses: [],
      totalPoints: 0,
    });
  }

  addRoundPoints(sessionId: string, round: number, points: number, reason: string): void {
    const player = this.players.get(sessionId);
    if (!player) return;
    player.roundScores.push({ round, points, reason });
    player.totalPoints += points;
    if (this.kidsMode && player.totalPoints < 0) {
      player.totalPoints = 0;
    }
  }

  addBonus(sessionId: string, points: number, reason: string): void {
    const player = this.players.get(sessionId);
    if (!player) return;
    player.bonuses.push({ points, reason });
    player.totalPoints += points;
    if (this.kidsMode && player.totalPoints < 0) {
      player.totalPoints = 0;
    }
  }

  getTotalPoints(sessionId: string): number {
    return this.players.get(sessionId)?.totalPoints ?? 0;
  }

  getLeaderboard(): ScoreEntry[] {
    const entries = Array.from(this.players.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((p) => {
        const breakdown: { label: string; points: number }[] = [];
        for (const rs of p.roundScores) {
          breakdown.push({ label: `R${rs.round}: ${rs.reason}`, points: rs.points });
        }
        for (const b of p.bonuses) {
          breakdown.push({ label: b.reason, points: b.points });
        }
        return {
          sessionId: p.sessionId,
          name: p.name,
          score: p.totalPoints,
          rank: 0,
          breakdown,
        };
      });

    let currentRank = 1;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;
      if (i > 0 && entry.score < (entries[i - 1]?.score ?? 0)) {
        currentRank = i + 1;
      }
      entry.rank = currentRank;
    }

    return entries;
  }

  reset(): void {
    this.players.clear();
  }
}
