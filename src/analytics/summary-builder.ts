import type { SessionSummary } from "~/types/session-analysis-export"
import type { Session } from "~/types/session"

export class SummaryBuilder {
  build(session: Session): SessionSummary {
    return {
      questionTitle: session.questionTitle,
      questionSlug: session.questionSlug,
      finalStatus: null,
      accepted: false,
      totalRuns: 0,
      totalSubmissions: 0,
      sessionDurationMs: 0
    }
  }
}

export const summaryBuilder = new SummaryBuilder()
