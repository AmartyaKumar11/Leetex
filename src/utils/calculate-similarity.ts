import type { Snapshot } from "~/types/snapshot"
import { computeCodeSimilarity } from "~/utils/code-similarity"

export function calculateSimilarity(
  previousSnapshot: Pick<Snapshot, "code">,
  currentSnapshot: Pick<Snapshot, "code">
): number {
  const similarity = computeCodeSimilarity(previousSnapshot.code, currentSnapshot.code)
  return Math.round(similarity * 100) / 100
}

export function calculateSimilarityFromCode(
  previousCode: string,
  currentCode: string
): number {
  return calculateSimilarity({ code: previousCode }, { code: currentCode })
}
