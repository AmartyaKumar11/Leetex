import type { BehavioralFeatures, SessionSummary } from "~/types/session-analysis-export"
import type { Session } from "~/types/session"
import { deriveFinalStatus, isSessionAccepted } from "~/analytics/session-status"
import { getEffectiveEndTime } from "~/utils/session-time"

export class SummaryBuilder {
  build(session: Session, features: BehavioralFeatures): SessionSummary {
    const endTime = getEffectiveEndTime(session)

    return {
      questionTitle: session.questionTitle,
      questionSlug: session.questionSlug,
      finalStatus: deriveFinalStatus(session),
      accepted: isSessionAccepted(session),
      totalRuns: features.solving.totalRuns,
      totalSubmissions: features.solving.totalSubmissions,
      sessionDurationMs: Math.max(0, endTime - session.startTime)
    }
  }
}

export const summaryBuilder = new SummaryBuilder()
