import type { BehavioralSignal } from "~/types/behavioral-signal"
import type { SessionMetrics } from "~/types/metrics"

export interface SessionAnalysis {
  timeline: string[]
  metrics: SessionMetrics
  behavioralSignals: BehavioralSignal[]
  analyzedAt: number
}
