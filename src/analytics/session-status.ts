import { EVENT_TYPES } from "~/types/events"
import type { ResultStatus } from "~/types/results"
import type { Session } from "~/types/session"

export function isSessionAccepted(session: Session): boolean {
  for (const attempt of session.attemptHistory ?? []) {
    if (attempt.type === "SUBMIT" && attempt.status === "Accepted") {
      return true
    }
  }

  for (const event of session.events ?? []) {
    if (event.type === EVENT_TYPES.SUBMISSION_RESULT && readStatus(event.metadata) === "Accepted") {
      return true
    }
  }

  return false
}

export function deriveFinalStatus(session: Session): string | null {
  const submitAttempts = [...(session.attemptHistory ?? [])]
    .filter((attempt) => attempt.type === "SUBMIT")
    .sort((a, b) => b.timestamp - a.timestamp)

  if (submitAttempts.length > 0) {
    return submitAttempts[0].status
  }

  for (const event of [...(session.events ?? [])].sort((a, b) => b.timestamp - a.timestamp)) {
    if (event.type === EVENT_TYPES.SUBMISSION_RESULT) {
      const status = readStatus(event.metadata)

      if (status) {
        return status
      }
    }
  }

  const runAttempts = [...(session.attemptHistory ?? [])]
    .filter((attempt) => attempt.type === "RUN")
    .sort((a, b) => b.timestamp - a.timestamp)

  if (runAttempts.length > 0) {
    return runAttempts[0].status
  }

  for (const event of [...(session.events ?? [])].sort((a, b) => b.timestamp - a.timestamp)) {
    if (event.type === EVENT_TYPES.RUN_RESULT) {
      const status = readStatus(event.metadata)

      if (status) {
        return status
      }
    }
  }

  return null
}

function readStatus(metadata?: Record<string, unknown>): ResultStatus | null {
  const value = metadata?.status

  if (typeof value === "string") {
    return value as ResultStatus
  }

  return null
}
