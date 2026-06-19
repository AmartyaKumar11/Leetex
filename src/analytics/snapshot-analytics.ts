import type { Session } from "~/types/session"

export interface SnapshotAnalytics {
  snapshotCount: number
  averageSimilarity: number
  minimumSimilarity: number
  majorRewriteCount: number
}

export class SnapshotAnalyticsEngine {
  analyze(_session: Session): SnapshotAnalytics {
    return {
      snapshotCount: 0,
      averageSimilarity: 0,
      minimumSimilarity: 0,
      majorRewriteCount: 0
    }
  }
}

export const snapshotAnalyticsEngine = new SnapshotAnalyticsEngine()
