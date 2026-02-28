import { getDrawerScore, getGuessScore, isCorrectGuess } from "../state";

describe("quick-draw/state", () => {
  it("isCorrectGuess: normalizes case, punctuation, and whitespace", () => {
    expect(isCorrectGuess(" Plot  twist ", "plot twist")).toBe(true);
    expect(isCorrectGuess("deja-vu!", "déjà vu")).toBe(true);
    expect(isCorrectGuess("CAT", "cat")).toBe(true);
  });

  it("getGuessScore: awards by position", () => {
    expect(getGuessScore(0)).toBe(500);
    expect(getGuessScore(1)).toBe(400);
    expect(getGuessScore(4)).toBe(100);
    expect(getGuessScore(10)).toBe(100);
  });

  it("getDrawerScore: scales by correct guessers", () => {
    expect(getDrawerScore(0)).toBe(0);
    expect(getDrawerScore(3)).toBe(300);
  });
});
