import { EVENT_TYPES } from "~/types/events"
import type { AttemptRecord } from "~/types/attempt"
import type { SessionMetrics } from "~/types/metrics"
import type { Session } from "~/types/session"
import type { SessionEvent } from "~/types/events"
import type { Snapshot } from "~/types/snapshot"
import { sessionMetricsService } from "~/services/session-metrics-service"
import { MAJOR_REWRITE_SIMILARITY_MAX } from "~/constants/behavioral-thresholds"

export interface SessionAnalysisContext {
  session: Session
  metrics: SessionMetrics
  events: SessionEvent[]
  attempts: AttemptRecord[]
  snapshots: Snapshot[]
  majorRewriteEvents: SessionEvent[]
  majorRewriteCount: number
  executions: AttemptRecord[]
  avgConsecutiveSnapshotSimilarity: number | null
}

export function buildSessionAnalysisContext(session: Session): SessionAnalysisContext {
  const metrics = session.metrics ?? sessionMetricsService.compute(session)
  const events = [...session.events].sort((a, b) => a.timestamp - b.timestamp)
  const attempts = [...session.attemptHistory].sort((a, b) => a.timestamp - b.timestamp)
  const snapshots = [...session.snapshots].sort((a, b) => a.timestamp - b.timestamp)

  const majorRewriteEvents = events.filter((e) => e.type === EVENT_TYPES.MAJOR_REWRITE)
  const executions = attempts.filter(
    (a) => a.type === "RUN" || a.type === "SUBMIT"
  )

  return {
    session,
    metrics,
    events,
    attempts,
    snapshots,
    majorRewriteEvents,
    majorRewriteCount: majorRewriteEvents.length,
    executions,
    avgConsecutiveSnapshotSimilarity: computeAvgConsecutiveSimilarity(snapshots)
  }
}

export function getEventTimestamp(
  ctx: SessionAnalysisContext,
  type: string
): number | null {
  const event = ctx.events.find((e) => e.type === type)
  return event?.timestamp ?? null
}

export function countMajorRewritesFromSnapshots(ctx: SessionAnalysisContext): number {
  return ctx.snapshots.filter(
    (s) =>
      s.similarityToPrevious !== null &&
      s.similarityToPrevious < MAJOR_REWRITE_SIMILARITY_MAX
  ).length
}

export function findFirstAcceptedIndex(executions: AttemptRecord[]): number {
  return executions.findIndex((a) => a.status === "Accepted")
}

export function getConsecutiveFailureStreak(executions: AttemptRecord[]): number {
  let maxStreak = 0
  let current = 0

  for (const attempt of executions) {
    if (attempt.status === "Accepted") {
      current = 0
      continue
    }

    current += 1
    maxStreak = Math.max(maxStreak, current)
  }

  return maxStreak
}

export function hasFailureThenAccepted(
  executions: AttemptRecord[],
  failureStatuses: string[]
): boolean {
  for (let i = 0; i < executions.length - 1; i += 1) {
    const current = executions[i]
    const next = executions[i + 1]

    if (failureStatuses.includes(current.status) && next.status === "Accepted") {
      return true
    }
  }

  return false
}

export function findFailureThenAcceptedPair(
  executions: AttemptRecord[],
  failureStatuses: string[]
): { failure: AttemptRecord; recovery: AttemptRecord } | null {
  for (let i = 0; i < executions.length - 1; i += 1) {
    const current = executions[i]
    const next = executions[i + 1]

    if (failureStatuses.includes(current.status) && next.status === "Accepted") {
      return { failure: current, recovery: next }
    }
  }

  return null
}

export function secondsAfterEvent(
  ctx: SessionAnalysisContext,
  eventType: string,
  targetTimestamp: number
): number | null {
  const event = ctx.events.find((e) => e.type === eventType)

  if (!event) {
    return null
  }

  return Math.floor((targetTimestamp - event.timestamp) / 1000)
}

function computeAvgConsecutiveSimilarity(snapshots: Snapshot[]): number | null {
  const similarities = snapshots
    .map((s) => s.similarityToPrevious)
    .filter((s): s is number => s !== null)

  if (similarities.length === 0) {
    return null
  }

  const sum = similarities.reduce((acc, val) => acc + val, 0)
  return sum / similarities.length
}
