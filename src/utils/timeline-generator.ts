import type { Session } from "~/types/session"
import type { TimelineEntry } from "~/types/timeline"
import type { SessionEvent } from "~/types/events"
import { EVENT_TYPES } from "~/types/events"

const EVENT_LABELS: Partial<Record<string, string>> = {
  [EVENT_TYPES.QUESTION_OPENED]: "Question Opened",
  [EVENT_TYPES.FIRST_EDIT]: "First Edit",
  [EVENT_TYPES.FIRST_RUN]: "First Run",
  [EVENT_TYPES.FIRST_SUBMIT]: "First Submit",
  [EVENT_TYPES.RUN_CODE]: "Run Code",
  [EVENT_TYPES.SUBMIT]: "Submit",
  [EVENT_TYPES.EDITORIAL_OPENED]: "Editorial Opened",
  [EVENT_TYPES.IDLE_STARTED]: "Idle Started",
  [EVENT_TYPES.IDLE_ENDED]: "Idle Ended",
  [EVENT_TYPES.LANGUAGE_CHANGED]: "Language Changed",
  [EVENT_TYPES.MAJOR_REWRITE]: "Major Rewrite",
  [EVENT_TYPES.RUN_RESULT]: "Run Result",
  [EVENT_TYPES.SUBMISSION_RESULT]: "Submission Result"
}

export function generateTimeline(session: Session): TimelineEntry[] {
  const sorted = [...session.events].sort((a, b) => a.timestamp - b.timestamp)

  return sorted.map((event) => toTimelineEntry(event, session.startTime))
}

export function formatTimelineLines(session: Session): string[] {
  return generateTimeline(session).map(
    (entry) => `${entry.elapsedLabel} ${entry.label}`
  )
}

function toTimelineEntry(event: SessionEvent, sessionStart: number): TimelineEntry {
  const elapsedMs = Math.max(0, event.timestamp - sessionStart)

  return {
    elapsedLabel: formatElapsed(elapsedMs),
    elapsedMs,
    label: resolveLabel(event),
    eventType: event.type,
    timestamp: event.timestamp
  }
}

function resolveLabel(event: SessionEvent): string {
  const base = EVENT_LABELS[event.type] ?? event.type

  if (event.type === EVENT_TYPES.RUN_RESULT || event.type === EVENT_TYPES.SUBMISSION_RESULT) {
    const status = event.metadata?.status

    if (typeof status === "string") {
      return String(status)
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
      return `Major Rewrite (${Math.round(similarity * 100)}% similar)`
    }
  }

  if (event.type === EVENT_TYPES.IDLE_ENDED) {
    const duration = event.metadata?.durationSeconds

    if (typeof duration === "number") {
      return `Idle Ended (${duration}s)`
    }
  }

  return base
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
