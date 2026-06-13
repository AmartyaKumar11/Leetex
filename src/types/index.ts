export type {
  Difficulty,
  Session,
  SessionJSON,
  SessionStatus,
  SessionSummary
} from "~/types/session"
export type {
  EventType,
  IdleEndedMetadata,
  LanguageChangedMetadata,
  MajorRewriteMetadata,
  RegisterEventOptions,
  RunResultMetadata,
  SessionEvent,
  SubmissionResultMetadata
} from "~/types/events"
export type { RegisterSnapshotOptions, Snapshot, SnapshotTrigger } from "~/types/snapshot"
export type { AttemptRecord, AttemptType } from "~/types/attempt"
export type {
  ResultData,
  ResultMetadata,
  ResultSourcePanel,
  ResultStatus
} from "~/types/results"
export type { TimelineEntry } from "~/types/timeline"
export type { SessionMetrics } from "~/types/metrics"
export type { SessionExportPayload, ExportMetadata } from "~/types/export"
export type { BehavioralSignal, BehavioralSignalType } from "~/types/behavioral-signal"
export type { SessionAnalysis } from "~/types/session-analysis"

export { BEHAVIORAL_SIGNALS } from "~/types/behavioral-signal"
export { EVENT_TYPES } from "~/types/events"
export { RESULT_STATUSES, mergeResultData, resultDataToRecord } from "~/types/results"
export { createEmptySessionMetrics } from "~/types/metrics"
