import { pickRandom, randomFloat, randomInt, shuffleInPlace } from "../utils/random";

function stubCryptoSequence(sequence: number[]) {
  const queue = [...sequence];
  vi.stubGlobal("crypto", {
    getRandomValues<T extends ArrayBufferView>(array: T): T {
      const value = queue.shift() ?? 0;
      const target = array as unknown as Uint32Array;
      target[0] = value;
      return array;
    },
  });
}

describe("shared/utils/random", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("validates randomInt arguments", () => {
    expect(() => randomInt(0)).toThrow("expects a positive integer");
    expect(() => randomInt(-2)).toThrow("expects a positive integer");
    expect(() => randomInt(2.2)).toThrow("expects a positive integer");
    expect(() => randomInt(4_294_967_297)).toThrow("supports up to");
  });

  it("uses rejection sampling to avoid modulo bias", () => {
    stubCryptoSequence([0xffff_ffff, 9]);
    expect(randomInt(10)).toBe(9);
  });

  it("generates randomFloat from uint32 range", () => {
    stubCryptoSequence([0x8000_0000]);
    expect(randomFloat()).toBeCloseTo(0.5, 8);
  });

  it("picks random items and handles empty arrays", () => {
    stubCryptoSequence([2]);
    expect(pickRandom(["a", "b", "c"])).toBe("c");
    expect(pickRandom([])).toBeUndefined();
  });

  it("shuffles in place using deterministic randomInt calls", () => {
    stubCryptoSequence([0, 2, 1]);
    const items = ["a", "b", "c", "d"];
    shuffleInPlace(items);
    expect(items).toEqual(["d", "b", "c", "a"]);
  });

  it("throws when secure RNG is unavailable", () => {
    vi.stubGlobal("crypto", undefined);
    expect(() => randomInt(2)).toThrow("Secure RNG unavailable");
  });
});
