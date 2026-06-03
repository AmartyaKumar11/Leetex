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
export type { ResultData, ResultMetadata, ResultStatus } from "~/types/results"
export { RESULT_STATUSES, resultDataToRecord, mergeResultData } from "~/types/results"
export type { TimelineEntry } from "~/types/timeline"

export { EVENT_TYPES } from "~/types/events"
