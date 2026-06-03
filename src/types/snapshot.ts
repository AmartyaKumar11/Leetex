import type { EventType } from "~/types/events"

export type SnapshotTrigger = EventType | "SESSION_START" | "PERIODIC"

export interface Snapshot {
  snapshotId: string
  timestamp: number
  trigger: SnapshotTrigger
  code: string
  language: string | null
  questionSlug: string
  snapshotHash: string
  similarityToPrevious: number | null
}

export interface RegisterSnapshotOptions {
  trigger: SnapshotTrigger
  code?: string
  language?: string | null
}
