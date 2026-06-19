import type { AttemptRecord } from "~/types/attempt"
import type { LearningSources, LearningSourceVisit } from "~/types/learning-source"
import type { SessionMetrics } from "~/types/metrics"

export type Difficulty = "Easy" | "Medium" | "Hard"

export type SessionStatus = "active" | "completed"

export interface Session {
  sessionId: string
  questionTitle: string
  questionSlug: string
  difficulty: Difficulty | null
  startTime: number
  endTime: number | null
  lastActivityTimestamp: number
  status: SessionStatus
  events: import("~/types/events").SessionEvent[]
  snapshots: import("~/types/snapshot").Snapshot[]
  attemptHistory: AttemptRecord[]
  metrics: SessionMetrics
  learningSources: LearningSources
  learningSourceVisits: LearningSourceVisit[]
}

export type SessionJSON = Session

export interface SessionSummary {
  sessionId: string
  questionTitle: string
  questionSlug: string
  difficulty: Difficulty | null
  startTime: number
  endTime: number | null
  status: SessionStatus
  eventCount: number
  snapshotCount: number
  attemptCount: number
}
