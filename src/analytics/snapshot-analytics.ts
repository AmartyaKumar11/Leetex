import { MAJOR_REWRITE_SIMILARITY_THRESHOLD } from "~/constants/signals"
import type { SnapshotAnalytics } from "~/types/session-analysis-export"
import type { Session } from "~/types/session"

export function analyzeSnapshots(session: Session): SnapshotAnalytics {
  const snapshots = session.snapshots ?? []
  const similarities = snapshots
    .map((snapshot) => snapshot.similarityToPrevious)
    .filter((value): value is number => value != null && Number.isFinite(value))

  const codeLengths = snapshots
    .map((snapshot) => snapshot.code?.length ?? 0)
    .filter((length) => Number.isFinite(length))

  const majorRewriteCount = snapshots.filter(
    (snapshot) =>
      snapshot.similarityToPrevious != null &&
      snapshot.similarityToPrevious < MAJOR_REWRITE_SIMILARITY_THRESHOLD
  ).length

  return {
    snapshotCount: snapshots.length,
    averageSimilarity: roundRatio(average(similarities)),
    minimumSimilarity: roundRatio(min(similarities)),
    maximumSimilarity: roundRatio(max(similarities)),
    majorRewriteCount,
    averageCodeLength: roundLength(average(codeLengths))
  }
}

export class SnapshotAnalyticsEngine {
  analyze(session: Session): SnapshotAnalytics {
    return analyzeSnapshots(session)
  }
}

export const snapshotAnalyticsEngine = new SnapshotAnalyticsEngine()

function average(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function min(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  return Math.min(...values)
}

function max(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  return Math.max(...values)
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000
}

function roundLength(value: number): number {
  return Math.round(value)
}
