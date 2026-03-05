import { expect, test } from "@playwright/test";

/**
 * Content Bank Depth — verify each game has enough content to sustain
 * multiple full games without repeats. This is a fast Node-only test
 * (no browser needed) that imports the content banks directly.
 */

test.describe("Content Bank Depth", () => {
  test("Brain Board has at least 10 boards per complexity", async () => {
    const { KIDS_BOARDS, STANDARD_BOARDS, ADVANCED_BOARDS } = await import(
      "../../games/brain-board/src/content/clue-bank"
    );

    expect(KIDS_BOARDS.length).toBeGreaterThanOrEqual(10);
    expect(STANDARD_BOARDS.length).toBeGreaterThanOrEqual(10);
    expect(ADVANCED_BOARDS.length).toBeGreaterThanOrEqual(10);

    // Each board should have 6 categories with 5 clues each
    for (const board of [...KIDS_BOARDS, ...STANDARD_BOARDS, ...ADVANCED_BOARDS]) {
      expect(board.categories.length).toBe(6);
      for (const category of board.categories) {
        expect(category.clues.length).toBe(5);
        for (const clue of category.clues) {
          expect(clue.answer.length).toBeGreaterThan(0);
          expect(clue.question.length).toBeGreaterThan(0);
          expect(clue.value).toBeGreaterThan(0);
        }
      }
    }
  });

  test("Lucky Letters has at least 30 puzzles per complexity", async () => {
    const { KIDS_PUZZLES, STANDARD_PUZZLES, ADVANCED_PUZZLES } = await import(
      "../../games/lucky-letters/src/content/phrase-bank"
    );

    expect(KIDS_PUZZLES.length).toBeGreaterThanOrEqual(30);
    expect(STANDARD_PUZZLES.length).toBeGreaterThanOrEqual(30);
    expect(ADVANCED_PUZZLES.length).toBeGreaterThanOrEqual(30);

    // Each puzzle should have a non-empty phrase and category
    for (const puzzle of [...KIDS_PUZZLES, ...STANDARD_PUZZLES, ...ADVANCED_PUZZLES]) {
      expect(puzzle.phrase.length).toBeGreaterThan(0);
      expect(puzzle.category.length).toBeGreaterThan(0);
    }
  });

  test("Survey Smash has at least 30 surveys per complexity", async () => {
    const { KIDS_SURVEYS, STANDARD_SURVEYS, ADVANCED_SURVEYS } = await import(
      "../../games/survey-smash/src/content/survey-bank"
    );

    expect(KIDS_SURVEYS.length).toBeGreaterThanOrEqual(30);
    expect(STANDARD_SURVEYS.length).toBeGreaterThanOrEqual(30);
    expect(ADVANCED_SURVEYS.length).toBeGreaterThanOrEqual(30);

    // Each survey should have a question and at least 5 answers
    for (const survey of [...KIDS_SURVEYS, ...STANDARD_SURVEYS, ...ADVANCED_SURVEYS]) {
      expect(survey.question.length).toBeGreaterThan(0);
      expect(survey.answers.length).toBeGreaterThanOrEqual(5);
      for (const answer of survey.answers) {
        expect(answer.text.length).toBeGreaterThan(0);
        expect(answer.points).toBeGreaterThan(0);
      }
    }
  });
});
