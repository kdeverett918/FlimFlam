const ANSWER_PREFIXES = /^(what|who|where)\s+(is|are)\s+(a\s+|an\s+|the\s+)?/i;

export function normalizeAnswer(raw: string): string {
  let s = raw.toLowerCase().trim();
  s = s.replace(ANSWER_PREFIXES, "");
  s = s.replace(/[^\w\s']/g, "");
  s = s.replace(/\s+/g, " ");
  s = s.trim();
  return s;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const prev: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  const curr: number[] = Array.from({ length: n + 1 }, () => 0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min((curr[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    for (let j = 0; j <= n; j++) {
      prev[j] = curr[j] ?? 0;
    }
  }

  return prev[n] ?? 0;
}

export function stringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

const DEFAULT_FUZZY_THRESHOLD = 0.85;

export function fuzzyMatch(
  playerAnswer: string,
  correctAnswer: string,
  threshold = DEFAULT_FUZZY_THRESHOLD,
): boolean {
  const normPlayer = normalizeAnswer(playerAnswer);
  const normCorrect = normalizeAnswer(correctAnswer);

  if (stringSimilarity(normPlayer, normCorrect) >= threshold) {
    return true;
  }

  if (
    normPlayer.length > 0 &&
    normCorrect.length > 0 &&
    (normPlayer.includes(normCorrect) || normCorrect.includes(normPlayer))
  ) {
    return true;
  }

  return false;
}
