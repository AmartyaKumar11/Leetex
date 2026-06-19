import { EVENT_TYPES, type SessionEvent } from "~/types/events"
import type { ReplayEntry, ReplayEntryCategory } from "~/types/session-analysis-export"
import type { Session } from "~/types/session"
import type { ResultStatus } from "~/types/results"

const REPLAY_EVENT_TYPES = new Set<string>([
  EVENT_TYPES.QUESTION_OPENED,
  EVENT_TYPES.FIRST_EDIT,
  EVENT_TYPES.LANGUAGE_CHANGED,
  EVENT_TYPES.FIRST_RUN,
  EVENT_TYPES.RUN_CODE,
  EVENT_TYPES.RUN_RESULT,
  EVENT_TYPES.FIRST_SUBMIT,
  EVENT_TYPES.SUBMIT,
  EVENT_TYPES.SUBMISSION_RESULT,
  EVENT_TYPES.MAJOR_REWRITE,
  EVENT_TYPES.EDITORIAL_OPENED,
  EVENT_TYPES.EDITORIAL_CLOSED,
  EVENT_TYPES.SOLUTION_OPENED,
  EVENT_TYPES.SOLUTION_CLOSED,
  EVENT_TYPES.DISCUSSION_OPENED,
  EVENT_TYPES.DISCUSSION_CLOSED
])

const EVENT_LABELS: Partial<Record<string, string>> = {
  [EVENT_TYPES.QUESTION_OPENED]: "Question Opened",
  [EVENT_TYPES.FIRST_EDIT]: "First Edit",
  [EVENT_TYPES.FIRST_RUN]: "First Run",
  [EVENT_TYPES.RUN_CODE]: "Run Code",
  [EVENT_TYPES.FIRST_SUBMIT]: "First Submit",
  [EVENT_TYPES.SUBMIT]: "Submit",
  [EVENT_TYPES.EDITORIAL_OPENED]: "Editorial Opened",
  [EVENT_TYPES.EDITORIAL_CLOSED]: "Editorial Closed",
  [EVENT_TYPES.SOLUTION_OPENED]: "Solutions Opened",
  [EVENT_TYPES.SOLUTION_CLOSED]: "Solutions Closed",
  [EVENT_TYPES.DISCUSSION_OPENED]: "Discussion Opened",
  [EVENT_TYPES.DISCUSSION_CLOSED]: "Discussion Closed",
  [EVENT_TYPES.LANGUAGE_CHANGED]: "Language Changed",
  [EVENT_TYPES.MAJOR_REWRITE]: "Major Rewrite",
  [EVENT_TYPES.RUN_RESULT]: "Run Result",
  [EVENT_TYPES.SUBMISSION_RESULT]: "Submission Result"
}

const ERROR_STATUSES = new Set<ResultStatus>([
  "Wrong Answer",
  "Runtime Error",
  "Compilation Error",
  "Time Limit Exceeded",
  "Memory Limit Exceeded"
])

export function generateReplay(session: Session): ReplayEntry[] {
  const sessionStart = session.startTime
  const events = [...(session.events ?? [])]
    .filter((event) => REPLAY_EVENT_TYPES.has(event.type))
    .sort((a, b) => a.timestamp - b.timestamp)

  return events.map((event) => toReplayEntry(event, sessionStart))
}

export class ReplayGenerator {
  generate(session: Session): ReplayEntry[] {
    return generateReplay(session)
  }
}

export const replayGenerator = new ReplayGenerator()

function toReplayEntry(event: SessionEvent, sessionStart: number): ReplayEntry {
  const relativeTimeMs = Math.max(0, event.timestamp - sessionStart)
  const category = resolveReplayCategory(event)
  const label = resolveReplayLabel(event)

  return {
    timestamp: event.timestamp,
    relativeTimeMs,
    category,
    event: label,
    metadata: pickReplayMetadata(event)
  }
}

function resolveReplayCategory(event: SessionEvent): ReplayEntryCategory {
  if (event.type === EVENT_TYPES.RUN_RESULT || event.type === EVENT_TYPES.SUBMISSION_RESULT) {
    const status = readStatus(event.metadata)

    if (status && ERROR_STATUSES.has(status)) {
      return "ERROR"
    }

    return event.type === EVENT_TYPES.RUN_RESULT ? "RUN" : "SUBMIT"
  }

  switch (event.type) {
    case EVENT_TYPES.QUESTION_OPENED:
      return "SESSION"
    case EVENT_TYPES.FIRST_EDIT:
    case EVENT_TYPES.LANGUAGE_CHANGED:
      return "EDIT"
    case EVENT_TYPES.FIRST_RUN:
    case EVENT_TYPES.RUN_CODE:
      return "RUN"
    case EVENT_TYPES.FIRST_SUBMIT:
    case EVENT_TYPES.SUBMIT:
      return "SUBMIT"
    case EVENT_TYPES.MAJOR_REWRITE:
      return "REWRITE"
    case EVENT_TYPES.EDITORIAL_OPENED:
    case EVENT_TYPES.EDITORIAL_CLOSED:
    case EVENT_TYPES.SOLUTION_OPENED:
    case EVENT_TYPES.SOLUTION_CLOSED:
    case EVENT_TYPES.DISCUSSION_OPENED:
    case EVENT_TYPES.DISCUSSION_CLOSED:
      return "LEARNING_SOURCE"
    default:
      return "SESSION"
  }
}

function resolveReplayLabel(event: SessionEvent): string {
  if (event.type === EVENT_TYPES.RUN_RESULT || event.type === EVENT_TYPES.SUBMISSION_RESULT) {
    const status = readStatus(event.metadata)

    if (status) {
      return status
    }
  }

  if (event.type === EVENT_TYPES.LANGUAGE_CHANGED) {
    const oldLanguage = event.metadata?.oldLanguage
    const newLanguage = event.metadata?.newLanguage

    if (typeof oldLanguage === "string" && typeof newLanguage === "string") {
      return `Language Changed (${oldLanguage} → ${newLanguage})`
    }
  }

  if (
    event.type === EVENT_TYPES.EDITORIAL_CLOSED ||
    event.type === EVENT_TYPES.SOLUTION_CLOSED ||
    event.type === EVENT_TYPES.DISCUSSION_CLOSED
  ) {
    const durationMs = readDurationMs(event.metadata)

    if (durationMs != null) {
      const label = EVENT_LABELS[event.type] ?? event.type
      const seconds = Math.round(durationMs / 1000)

      return `${label} (${seconds}s)`
    }
  }

  return EVENT_LABELS[event.type] ?? event.type
}

function pickReplayMetadata(event: SessionEvent): Record<string, unknown> | undefined {
  const metadata: Record<string, unknown> = {}
  const status = readStatus(event.metadata)

  if (status) {
    metadata.status = status
  }

  const durationMs = readDurationMs(event.metadata)

  if (durationMs != null) {
    metadata.durationMs = durationMs
  }

  const similarity = event.metadata?.similarity

  if (typeof similarity === "number" && Number.isFinite(similarity)) {
    metadata.similarity = similarity
  }

  if (event.type === EVENT_TYPES.LANGUAGE_CHANGED) {
    const oldLanguage = event.metadata?.oldLanguage
    const newLanguage = event.metadata?.newLanguage

    if (typeof oldLanguage === "string") {
      metadata.oldLanguage = oldLanguage
    }

    if (typeof newLanguage === "string") {
      metadata.newLanguage = newLanguage
    }
  }

  const trigger = event.metadata?.trigger

  if (typeof trigger === "string") {
    metadata.trigger = trigger
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined
}

function readStatus(metadata?: Record<string, unknown>): ResultStatus | null {
  const value = metadata?.status

  if (typeof value === "string") {
    return value as ResultStatus
  }

  return null
}

function readDurationMs(metadata?: Record<string, unknown>): number | null {
  const value = metadata?.durationMs

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value))
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed))
    }
  }

  return null
}
