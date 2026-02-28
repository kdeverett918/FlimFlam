/**
 * Quick Draw scoring constants.
 *
 * Guessers: Speed-based (500/400/300/200/100 by order)
 * Drawer: 100 per correct guesser
 */

export const SCORING = {
  GUESS_POINTS: [500, 400, 300, 200, 100] as readonly number[],
  DRAWER_PER_GUESSER: 100,
} as const;
