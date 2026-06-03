/**
 * Lightweight code similarity (0 = no overlap, 1 = identical).
 * Uses character bigram Jaccard — fast, no external deps.
 */
export function computeCodeSimilarity(previous: string, current: string): number {
  const a = normalizeForComparison(previous)
  const b = normalizeForComparison(current)

  if (a === b) {
    return 1
  }

  if (!a.length || !b.length) {
    return 0
  }

  const bigramsA = buildBigrams(a)
  const bigramsB = buildBigrams(b)

  if (bigramsA.size === 0 && bigramsB.size === 0) {
    return 1
  }

  if (bigramsA.size === 0 || bigramsB.size === 0) {
    return 0
  }

  let intersection = 0

  for (const gram of bigramsA) {
    if (bigramsB.has(gram)) {
      intersection += 1
    }
  }

  const union = bigramsA.size + bigramsB.size - intersection

  return union === 0 ? 0 : intersection / union
}

export function isMajorRewrite(
  previous: string,
  current: string,
  threshold: number
): boolean {
  return computeCodeSimilarity(previous, current) < threshold
}

function normalizeForComparison(code: string): string {
  return code.replace(/\s+/g, " ").trim()
}

function buildBigrams(text: string): Set<string> {
  const bigrams = new Set<string>()

  if (text.length < 2) {
    if (text.length === 1) {
      bigrams.add(text)
    }

    return bigrams
  }

  for (let i = 0; i < text.length - 1; i += 1) {
    bigrams.add(text.slice(i, i + 2))
  }

  return bigrams
}
