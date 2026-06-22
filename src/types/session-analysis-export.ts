export const SESSION_ANALYSIS_VERSION = "0.4.0-alpha" as const

export type ReplayEntryCategory =
  | "SESSION"
  | "EDIT"
  | "RUN"
  | "SUBMIT"
  | "ERROR"
  | "LEARNING_SOURCE"
  | "REWRITE"

export interface ReplayEntry {
  timestamp: number
  relativeTimeMs: number
  category: ReplayEntryCategory
  event: string
  metadata?: Record<string, unknown>
}

export interface SessionSummary {
  questionTitle: string
  questionSlug: string
  finalStatus: string | null
  accepted: boolean
  totalRuns: number
  totalSubmissions: number
  sessionDurationMs: number
}

export interface BehavioralFeatures {
  solving: {
    timeToFirstEdit: number | null
    timeToFirstRun: number | null
    timeToFirstSubmit: number | null
    totalRuns: number
    totalSubmissions: number
  }
  debugging: {
    compileErrors: number
    runtimeErrors: number
    wrongAnswers: number
    compileErrorCategories: string[]
    runtimeErrorCategories: string[]
  }
  rewrites: {
    majorRewrites: number
    firstRewriteAt: number | null
    rewriteBeforeAccepted: boolean
  }
  learning: {
    editorialVisits: number
    editorialTimeMs: number
    solutionVisits: number
    solutionTimeMs: number
    discussionVisits: number
    discussionTimeMs: number
  }
  session: {
    sessionDurationMs: number
    activeDurationMs: number
    idleDurationMs: number
    longIdleCount: number
  }
}

export enum SessionClassification {
  SELF_SOLVED = "SELF_SOLVED",
  EDITORIAL_ASSISTED = "EDITORIAL_ASSISTED",
  SOLUTION_ASSISTED = "SOLUTION_ASSISTED",
  DISCUSSION_ASSISTED = "DISCUSSION_ASSISTED",
  DEBUG_HEAVY = "DEBUG_HEAVY",
  REWRITE_HEAVY = "REWRITE_HEAVY"
}

export interface SnapshotAnalytics {
  snapshotCount: number
  averageSimilarity: number
  minimumSimilarity: number
  maximumSimilarity: number
  majorRewriteCount: number
  averageCodeLength: number
}

export interface SessionAnalysis {
  sessionId: string
  generatedAt: number
  analysisVersion: typeof SESSION_ANALYSIS_VERSION
  summary: SessionSummary
  timeline: ReplayEntry[]
  behavioralFeatures: BehavioralFeatures
  snapshotAnalytics: SnapshotAnalytics
  classifications: SessionClassification[]
}

export function createPlaceholderBehavioralFeatures(): BehavioralFeatures {
  return {
    solving: {
      timeToFirstEdit: null,
      timeToFirstRun: null,
      timeToFirstSubmit: null,
      totalRuns: 0,
      totalSubmissions: 0
    },
    debugging: {
      compileErrors: 0,
      runtimeErrors: 0,
      wrongAnswers: 0,
      compileErrorCategories: [],
      runtimeErrorCategories: []
    },
    rewrites: {
      majorRewrites: 0,
      firstRewriteAt: null,
      rewriteBeforeAccepted: false
    },
    learning: {
      editorialVisits: 0,
      editorialTimeMs: 0,
      solutionVisits: 0,
      solutionTimeMs: 0,
      discussionVisits: 0,
      discussionTimeMs: 0
    },
    session: {
      sessionDurationMs: 0,
      activeDurationMs: 0,
      idleDurationMs: 0,
      longIdleCount: 0
    }
  }
}
