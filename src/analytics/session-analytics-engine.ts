import { classificationEngine } from "~/analytics/classification-engine"
import { featureExtractor } from "~/analytics/feature-extractor"
import { replayGenerator } from "~/analytics/replay-generator"
import { snapshotAnalyticsEngine } from "~/analytics/snapshot-analytics"
import { summaryBuilder } from "~/analytics/summary-builder"
import type { SessionAnalysis } from "~/types/session-analysis-export"
import { SESSION_ANALYSIS_VERSION } from "~/types/session-analysis-export"
import type { Session } from "~/types/session"
import { now } from "~/utils/time"

export class SessionAnalyticsEngine {
  analyze(session: Session): SessionAnalysis {
    const behavioralFeatures = featureExtractor.extract(session)
    const snapshotAnalytics = snapshotAnalyticsEngine.analyze(session)
    const classifications = classificationEngine.classify(session, behavioralFeatures)

    return {
      sessionId: session.sessionId,
      generatedAt: now(),
      analysisVersion: SESSION_ANALYSIS_VERSION,
      summary: summaryBuilder.build(session, behavioralFeatures),
      timeline: replayGenerator.generate(session),
      behavioralFeatures,
      snapshotAnalytics,
      classifications
    }
  }
}

export const sessionAnalyticsEngine = new SessionAnalyticsEngine()
