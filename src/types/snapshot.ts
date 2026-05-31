import type { EventType } from "~/types/events"

export type SnapshotTrigger = EventType | "SESSION_START"

export interface Snapshot {
  snapshotId: string
  timestamp: number
  trigger: SnapshotTrigger
  code: string
  language: string | null
  questionSlug: string
}

export interface RegisterSnapshotOptions {
  trigger: SnapshotTrigger
  code?: string
  language?: string | null
}
