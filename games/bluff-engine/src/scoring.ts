/**
 * Bluff Engine scoring constants.
 *
 * - Fool a player (they voted for YOUR fake): +100
 * - Correctly identify the real answer: +200
 * - Got fooled (voted for a fake): -50
 */

export const SCORING = {
  FOOL_PLAYER: 100,
  CORRECT_VOTE: 200,
  GOT_FOOLED: -50,
} as const;
