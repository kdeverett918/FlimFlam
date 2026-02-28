import { isTooSimilarToReal, shuffleArray, validateAnswer } from "../state";

describe("bluff-engine/state", () => {
  it("validateAnswer: rejects non-string and empty", () => {
    expect(validateAnswer(null).valid).toBe(false);
    expect(validateAnswer("").valid).toBe(false);
    expect(validateAnswer("   ").valid).toBe(false);
  });

  it("validateAnswer: trims and accepts valid input", () => {
    const res = validateAnswer("  bluff  ");
    expect(res.valid).toBe(true);
    expect(res.value).toBe("bluff");
  });

  it("isTooSimilarToReal: ignores case and punctuation", () => {
    expect(isTooSimilarToReal("Canberra!", "canberra")).toBe(true);
    expect(isTooSimilarToReal("Can berra", "Canberra")).toBe(true);
    expect(isTooSimilarToReal("Sydney", "Canberra")).toBe(false);
  });

  it("shuffleArray: preserves elements", () => {
    const input = [1, 2, 3, 4, 5];
    const output = shuffleArray([...input]);
    expect(output).toHaveLength(input.length);
    expect([...output].sort()).toEqual([...input].sort());
  });
});
