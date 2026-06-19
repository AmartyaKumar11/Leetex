import type { Session } from "~/types/session"

export function getLatestTimestampInSession(session: Session): number | null {
  let latest: number | null = null

  for (const event of session.events ?? []) {
    latest = maxTimestamp(latest, event.timestamp)
  }

  for (const attempt of session.attemptHistory ?? []) {
    latest = maxTimestamp(latest, attempt.timestamp)
  }

  for (const snapshot of session.snapshots ?? []) {
    latest = maxTimestamp(latest, snapshot.timestamp)
  }

  for (const visit of session.learningSourceVisits ?? []) {
    latest = maxTimestamp(latest, visit.openedAt, visit.closedAt)
  }

  return latest
}

export function getEffectiveEndTime(session: Session): number {
  if (session.endTime != null) {
    return session.endTime
  }

  return getLatestTimestampInSession(session) ?? session.startTime
}

export function resolveLastActivityTimestamp(session: Session): number {
  if (typeof session.lastActivityTimestamp === "number") {
    return session.lastActivityTimestamp
  }

  return getLatestTimestampInSession(session) ?? session.startTime
}

export function isSessionTimedOut(
  lastActivityTimestamp: number,
  activityTimestamp: number,
  timeoutMs: number
): boolean {
  return activityTimestamp - lastActivityTimestamp > timeoutMs
}

function maxTimestamp(current: number | null, ...candidates: number[]): number | null {
  let latest = current

  for (const candidate of candidates) {
    if (!Number.isFinite(candidate)) {
      continue
    }

    if (latest == null || candidate > latest) {
      latest = candidate
    }
  }

  return latest
}
