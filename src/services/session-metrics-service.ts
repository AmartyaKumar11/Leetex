import { EVENT_TYPES } from "~/types/events"
import { createEmptySessionMetrics, type SessionMetrics } from "~/types/metrics"
import type { Session } from "~/types/session"
import { now } from "~/utils/time"
import { observerDebugLog } from "~/utils/observer-debug"

export class SessionMetricsService {
  compute(session: Session): SessionMetrics {
    const endTime = session.endTime ?? now()
    const sessionDuration = Math.max(0, endTime - session.startTime)

    const metrics: SessionMetrics = {
      timeToFirstEdit: findElapsedMs(session, EVENT_TYPES.FIRST_EDIT),
      timeToFirstRun: findElapsedMs(session, EVENT_TYPES.FIRST_RUN),
      timeToFirstSubmit: findElapsedMs(session, EVENT_TYPES.FIRST_SUBMIT),
      totalRuns: countEvents(session, EVENT_TYPES.RUN_CODE),
      totalSubmissions: countEvents(session, EVENT_TYPES.SUBMIT),
      totalSnapshots: session.snapshots.length,
      totalActiveDuration: computeActiveDuration(session, sessionDuration),
      sessionDuration: Math.floor(sessionDuration / 1000)
    }

    observerDebugLog("Session Metrics Generated", metrics)

    return metrics
  }

  attach(session: Session): Session {
    return {
      ...session,
      metrics: this.compute(session)
    }
  }
}

function findElapsedMs(session: Session, type: string): number | null {
  const event = session.events.find((item) => item.type === type)

  if (!event) {
    return null
  }

  return Math.floor((event.timestamp - session.startTime) / 1000)
}

function countEvents(session: Session, type: string): number {
  return session.events.filter((item) => item.type === type).length
}

function computeActiveDuration(session: Session, sessionDurationMs: number): number {
  let idleSeconds = 0

  for (const event of session.events) {
    if (event.type === EVENT_TYPES.IDLE_ENDED) {
      const duration = event.metadata?.durationSeconds

      if (typeof duration === "number") {
        idleSeconds += duration
      }
    }
  }

  const activeMs = Math.max(0, sessionDurationMs - idleSeconds * 1000)
  return Math.floor(activeMs / 1000)
}

export const sessionMetricsService = new SessionMetricsService()

export { createEmptySessionMetrics }
