import type { Session } from "~/types/session"
import { generateTimeline } from "~/utils/timeline-generator"

const UI_TIMELINE_LABELS: Record<string, string> = {
  "Question Opened": "Opened Problem",
  "First Edit": "First Edit",
  "First Run": "First Run",
  "First Submit": "First Submit",
  "Major Rewrite": "Major Revision",
  "Language Changed": "Language Changed",
  "Run Result": "Run",
  "Submission Result": "Submit",
  Accepted: "Accepted",
  "Wrong Answer": "Wrong Answer",
  "Runtime Error": "Runtime Error",
  "Compilation Error": "Compilation Error",
  "Time Limit Exceeded": "Time Limit Exceeded",
  "Memory Limit Exceeded": "Memory Limit Exceeded"
}

function formatClockLabel(timestamp: number): string {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${hours}:${minutes}`
}

function toDisplayLabel(label: string): string {
  if (UI_TIMELINE_LABELS[label]) {
    return UI_TIMELINE_LABELS[label]!
  }

  if (label.startsWith("Language Changed")) {
    return label
  }

  return label
}

/** User-facing timeline lines: "09:04 First Edit" */
export function formatTimelineForDisplay(session: Session): string[] {
  return generateTimeline(session).map(
    (entry) => `${formatClockLabel(entry.timestamp)} ${toDisplayLabel(entry.label)}`
  )
}
