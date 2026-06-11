import { SIGNAL_RULES } from "~/behavioral/signal-rules"
import { buildSessionAnalysisContext } from "~/behavioral/session-context"
import { sessionMetricsService } from "~/services/session-metrics-service"
import type { BehavioralSignal } from "~/types/behavioral-signal"
import type { SessionAnalysis } from "~/types/session-analysis"
import type { Session } from "~/types/session"
import { formatTimelineLines } from "~/utils/timeline-generator"
import { now } from "~/utils/time"

export class BehavioralSignalEngine {
  analyze(session: Session): SessionAnalysis {
    const normalized = sessionMetricsService.attach(session)
    const ctx = buildSessionAnalysisContext(normalized)
    const behavioralSignals = this.evaluateRules(ctx)

    return {
      timeline: formatTimelineLines(normalized),
      metrics: ctx.metrics,
      behavioralSignals,
      analyzedAt: now()
    }
  }

  generateSignals(session: Session): BehavioralSignal[] {
    const ctx = buildSessionAnalysisContext(sessionMetricsService.attach(session))
    return this.evaluateRules(ctx)
  }

  private evaluateRules(
    ctx: ReturnType<typeof buildSessionAnalysisContext>
  ): BehavioralSignal[] {
    const signals: BehavioralSignal[] = []
    const seen = new Set<string>()

    for (const rule of SIGNAL_RULES) {
      const result = rule(ctx)

      if (!result || seen.has(result.signal)) {
        continue
      }

      seen.add(result.signal)
      signals.push(result)
    }

    return signals.sort((a, b) => b.confidence - a.confidence)
  }
}

export const behavioralSignalEngine = new BehavioralSignalEngine()
