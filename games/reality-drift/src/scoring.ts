/**
 * Reality Drift scoring constants.
 *
 * - Correct answer on a real question: +100
 * - Catch a drift (correctly call a fake question): +200
 * - False drift call (real question called as drift): -150
 */

export const SCORING = {
  CORRECT_ANSWER: 100,
  CATCH_DRIFT: 200,
  FALSE_DRIFT_CALL: -150,
} as const;
