type CryptoLike = {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
};

const MAX_UINT32_EXCLUSIVE = 0x1_0000_0000; // 2^32

function getCrypto(): CryptoLike | null {
  const c = (globalThis as unknown as { crypto?: CryptoLike }).crypto;
  return c && typeof c.getRandomValues === "function" ? c : null;
}

function randomUint32(): number {
  const cryptoObj = getCrypto();
  if (!cryptoObj) {
    throw new Error(
      "[FlimFlam] Secure RNG unavailable: globalThis.crypto.getRandomValues() not found.",
    );
  }

  const buf = new Uint32Array(1);
  cryptoObj.getRandomValues(buf);
  // biome-ignore lint/style/noNonNullAssertion: Uint32Array(1) always has index 0
  return buf[0]!;
}

/**
 * Cryptographically-strong random integer in the range [0, maxExclusive).
 *
 * Uses rejection sampling to avoid modulo bias.
 */
export function randomInt(maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error(
      `[FlimFlam] randomInt(maxExclusive) expects a positive integer. Got: ${maxExclusive}`,
    );
  }

  if (maxExclusive > MAX_UINT32_EXCLUSIVE) {
    throw new Error(
      `[FlimFlam] randomInt(maxExclusive) supports up to ${MAX_UINT32_EXCLUSIVE}. Got: ${maxExclusive}`,
    );
  }

  const limit = MAX_UINT32_EXCLUSIVE - (MAX_UINT32_EXCLUSIVE % maxExclusive);
  let x = randomUint32();
  while (x >= limit) x = randomUint32();
  return x % maxExclusive;
}

/** Cryptographically-strong float in the range [0, 1). */
export function randomFloat(): number {
  return randomUint32() / MAX_UINT32_EXCLUSIVE;
}

export function pickRandom<T>(items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[randomInt(items.length)];
}

export function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = items[i];
    items[i] = items[j] as T;
    items[j] = tmp as T;
  }
}
