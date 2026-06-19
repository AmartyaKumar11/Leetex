export type LearningSourceId = "editorial" | "solutions" | "discussion"

export type LearningSourceView = LearningSourceId | "editor"

export interface LearningSourceStats {
  visits: number
  timeMs: number
}

export interface LearningSources {
  editorial: LearningSourceStats
  solutions: LearningSourceStats
  discussion: LearningSourceStats
}

export interface LearningSourceClosedMetadata {
  durationMs: number
}

export interface LearningSourceVisit {
  source: LearningSourceId
  openedAt: number
  closedAt: number
  durationMs: number
}

export function createEmptyLearningSources(): LearningSources {
  return {
    editorial: { visits: 0, timeMs: 0 },
    solutions: { visits: 0, timeMs: 0 },
    discussion: { visits: 0, timeMs: 0 }
  }
}
