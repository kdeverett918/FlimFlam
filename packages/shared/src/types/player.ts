export interface PlayerData {
  sessionId: string;
  name: string;
  avatarColor: string;
  connected: boolean;
  ready: boolean;
  hasSubmitted: boolean;
  score: number;
  isHost: boolean;

  // Generic cross-game fields (overloaded by different games).
  role: string;
  publicInfo: string;
  progressOrCustomInt: number;
  abilityOrCustomBool: boolean;
  currentInput: string;
}
