import type { SessionSummary } from "~/types/session-analysis-export"
import type { Session } from "~/types/session"
import { getEffectiveEndTime } from "~/utils/session-time"

export class SummaryBuilder {
  build(session: Session): SessionSummary {
    const endTime = getEffectiveEndTime(session)

    return {
      questionTitle: session.questionTitle,
      questionSlug: session.questionSlug,
      finalStatus: null,
      accepted: false,
      totalRuns: 0,
      totalSubmissions: 0,
      sessionDurationMs: Math.max(0, endTime - session.startTime)
    }
  }
}

export const summaryBuilder = new SummaryBuilder()
