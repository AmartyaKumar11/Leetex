export type Difficulty = "Easy" | "Medium" | "Hard"

export type SessionStatus = "active" | "completed"

export interface Session {
  sessionId: string
  questionTitle: string
  questionSlug: string
  difficulty: Difficulty | null
  startTime: number
  endTime: number | null
  status: SessionStatus
  events: import("~/types/events").SessionEvent[]
  snapshots: import("~/types/snapshot").Snapshot[]
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
}
