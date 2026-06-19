import type { Session } from "~/types/session"
import type { TimelineEntry } from "~/types/timeline"
import type { SessionEvent } from "~/types/events"
import type { Snapshot } from "~/types/snapshot"
import { EVENT_TYPES } from "~/types/events"

const TIMELINE_EVENT_TYPES = new Set<string>([
  EVENT_TYPES.QUESTION_OPENED,
  EVENT_TYPES.FIRST_EDIT,
  EVENT_TYPES.FIRST_RUN,
  EVENT_TYPES.FIRST_SUBMIT,
  EVENT_TYPES.RUN_RESULT,
  EVENT_TYPES.SUBMISSION_RESULT,
  EVENT_TYPES.MAJOR_REWRITE,
  EVENT_TYPES.LANGUAGE_CHANGED,
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
  [EVENT_TYPES.FIRST_SUBMIT]: "First Submit",
  [EVENT_TYPES.EDITORIAL_OPENED]: "Editorial Opened",
  [EVENT_TYPES.EDITORIAL_CLOSED]: "Editorial Closed",
  [EVENT_TYPES.SOLUTION_OPENED]: "Solutions Opened",
  [EVENT_TYPES.SOLUTION_CLOSED]: "Solutions Closed",
  [EVENT_TYPES.DISCUSSION_OPENED]: "Discussion Opened",
  [EVENT_TYPES.DISCUSSION_CLOSED]: "Discussion Closed",
  [EVENT_TYPES.LANGUAGE_CHANGED]: "Language Changed",
  [EVENT_TYPES.MAJOR_REWRITE]: "Major Rewrite",
  [EVENT_TYPES.RUN_RESULT]: "Run Result",
  [EVENT_TYPES.SUBMISSION_RESULT]: "Submission Result",
  PERIODIC: "Periodic Snapshot"
}

export function generateTimeline(session: Session): TimelineEntry[] {
  const eventEntries = session.events
    .filter((event) => TIMELINE_EVENT_TYPES.has(event.type))
    .map((event) => toEventTimelineEntry(event, session.startTime))

  const periodicEntries = session.snapshots
    .filter((snapshot) => snapshot.trigger === "PERIODIC")
    .map((snapshot) => toSnapshotTimelineEntry(snapshot, session.startTime))

  return [...eventEntries, ...periodicEntries].sort(
    (a, b) => a.timestamp - b.timestamp
  )
}

export function formatTimelineLines(session: Session): string[] {
  return generateTimeline(session).map(
    (entry) => `${entry.elapsedLabel} ${entry.label}`
  )
}

function toEventTimelineEntry(event: SessionEvent, sessionStart: number): TimelineEntry {
  const elapsedMs = Math.max(0, event.timestamp - sessionStart)

  return {
    elapsedLabel: formatElapsed(elapsedMs),
    elapsedMs,
    label: resolveEventLabel(event),
    eventType: event.type,
    timestamp: event.timestamp
  }
}

function toSnapshotTimelineEntry(snapshot: Snapshot, sessionStart: number): TimelineEntry {
  const elapsedMs = Math.max(0, snapshot.timestamp - sessionStart)

  return {
    elapsedLabel: formatElapsed(elapsedMs),
    elapsedMs,
    label: EVENT_LABELS.PERIODIC ?? "Periodic Snapshot",
    eventType: "PERIODIC_SNAPSHOT",
    timestamp: snapshot.timestamp
  }
}

function resolveEventLabel(event: SessionEvent): string {
  if (event.type === EVENT_TYPES.RUN_RESULT || event.type === EVENT_TYPES.SUBMISSION_RESULT) {
    const status = event.metadata?.status

    if (typeof status === "string") {
      return status
    }
  }

  if (event.type === EVENT_TYPES.LANGUAGE_CHANGED) {
    const oldLang = event.metadata?.oldLanguage
    const newLang = event.metadata?.newLanguage

    if (typeof oldLang === "string" && typeof newLang === "string") {
      return `Language Changed (${oldLang} → ${newLang})`
    }
  }

  if (event.type === EVENT_TYPES.MAJOR_REWRITE) {
    const similarity = event.metadata?.similarity

    if (typeof similarity === "number") {
      return "Major Rewrite"
    }
  }

  if (
    event.type === EVENT_TYPES.EDITORIAL_CLOSED ||
    event.type === EVENT_TYPES.SOLUTION_CLOSED ||
    event.type === EVENT_TYPES.DISCUSSION_CLOSED
  ) {
    const durationMs = event.metadata?.durationMs

    if (typeof durationMs === "number") {
      const label = EVENT_LABELS[event.type] ?? event.type
      const seconds = Math.round(durationMs / 1000)

      return `${label} (${seconds}s)`
    }
  }

  return EVENT_LABELS[event.type] ?? event.type
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
