import { classificationEngine } from "~/analytics/classification-engine"
import { featureExtractor } from "~/analytics/feature-extractor"
import { replayGenerator } from "~/analytics/replay-generator"
import { summaryBuilder } from "~/analytics/summary-builder"
import type { SessionAnalysis } from "~/types/session-analysis-export"
import { SESSION_ANALYSIS_VERSION } from "~/types/session-analysis-export"
import type { Session } from "~/types/session"
import { now } from "~/utils/time"

export class SessionAnalyticsEngine {
  analyze(session: Session): SessionAnalysis {
    const behavioralFeatures = featureExtractor.extract(session)
    const classifications = classificationEngine.classify(session, behavioralFeatures)

    return {
      sessionId: session.sessionId,
      generatedAt: now(),
      analysisVersion: SESSION_ANALYSIS_VERSION,
      summary: summaryBuilder.build(session),
      timeline: replayGenerator.generate(session),
      behavioralFeatures,
      classifications
    }
  }
}

export const sessionAnalyticsEngine = new SessionAnalyticsEngine()
