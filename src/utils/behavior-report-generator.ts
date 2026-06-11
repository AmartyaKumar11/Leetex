import type { BehavioralSignal, BehavioralSignalType } from "~/types/behavioral-signal"
import { BEHAVIORAL_SIGNALS } from "~/types/behavioral-signal"
import type { SessionAnalysis } from "~/types/session-analysis"
import { behavioralSignalEngine } from "~/services/behavioral-signal-engine"
import type { Session } from "~/types/session"

const SIGNAL_NARRATIVES: Record<BehavioralSignalType, string> = {
  [BEHAVIORAL_SIGNALS.SHORT_READING_PHASE]:
    "User started coding after a brief reading phase.",
  [BEHAVIORAL_SIGNALS.LONG_READING_PHASE]:
    "User spent significant time reading before writing code.",
  [BEHAVIORAL_SIGNALS.IMMEDIATE_CODING]:
    "User began coding almost immediately after opening the problem.",
  [BEHAVIORAL_SIGNALS.FAST_CONVERGENCE]:
    "User reached an accepted solution within very few executions.",
  [BEHAVIORAL_SIGNALS.HEAVY_ITERATION]:
    "User ran code many times, indicating heavy iteration.",
  [BEHAVIORAL_SIGNALS.TRIAL_AND_ERROR_LOOP]:
    "User repeatedly tweaked the solution with small changes rather than rewriting.",
  [BEHAVIORAL_SIGNALS.APPROACH_ABANDONMENT]:
    "User abandoned an initial approach and pivoted to a different solution strategy.",
  [BEHAVIORAL_SIGNALS.MULTIPLE_REWRITES]:
    "User made multiple major rewrites during the session.",
  [BEHAVIORAL_SIGNALS.SINGLE_BUG_FIX]:
    "User recovered from an error and reached acceptance on the next execution.",
  [BEHAVIORAL_SIGNALS.REPEATED_FAILURE_LOOP]:
    "User hit a streak of consecutive failures without acceptance.",
  [BEHAVIORAL_SIGNALS.RUNTIME_ERROR_RECOVERY]:
    "User recovered from a runtime error and achieved acceptance.",
  [BEHAVIORAL_SIGNALS.COMPILATION_ERROR_RECOVERY]:
    "User recovered from a compilation error and achieved acceptance.",
  [BEHAVIORAL_SIGNALS.EDGE_CASE_STRUGGLE]:
    "User passed most test cases but failed near full acceptance — likely an edge-case issue.",
  [BEHAVIORAL_SIGNALS.LATE_EDGE_CASE_DISCOVERY]:
    "User had several high-pass runs before failing near acceptance.",
  [BEHAVIORAL_SIGNALS.EDITORIAL_DEPENDENCY]:
    "User opened the editorial and accepted shortly afterward.",
  [BEHAVIORAL_SIGNALS.HINT_DEPENDENCY]:
    "User opened a hint and accepted shortly afterward.",
  [BEHAVIORAL_SIGNALS.DIRECT_SOLUTION]:
    "User solved the problem quickly with minimal iteration.",
  [BEHAVIORAL_SIGNALS.EXPERIMENTAL_EXPLORATION]:
    "User explored multiple approaches with extensive editing and running."
}

export function generateBehaviorReport(session: Session): string {
  const analysis = behavioralSignalEngine.analyze(session)
  return formatBehaviorReport(analysis)
}

export function formatBehaviorReport(analysis: SessionAnalysis): string {
  const lines: string[] = ["Behavior Summary", ""]

  if (analysis.behavioralSignals.length === 0) {
    lines.push("* No strong behavioral signals detected for this session.")
    lines.push("")
    lines.push("Timeline")
    lines.push(...analysis.timeline.map((line) => `  ${line}`))
    return lines.join("\n")
  }

  for (const signal of analysis.behavioralSignals) {
    lines.push(formatSignalBullet(signal))
  }

  lines.push("")
  lines.push("Timeline")
  lines.push(...analysis.timeline.map((line) => `  ${line}`))

  lines.push("")
  lines.push("Metrics")
  lines.push(`  timeToFirstEdit: ${formatMetric(analysis.metrics.timeToFirstEdit)}`)
  lines.push(`  timeToFirstRun: ${formatMetric(analysis.metrics.timeToFirstRun)}`)
  lines.push(`  totalRuns: ${analysis.metrics.totalRuns}`)
  lines.push(`  sessionDuration: ${analysis.metrics.sessionDuration}s`)

  return lines.join("\n")
}

function formatSignalBullet(signal: BehavioralSignal): string {
  const narrative = SIGNAL_NARRATIVES[signal.signal] ?? signal.signal
  const evidence = signal.evidence.length > 0 ? ` (${signal.evidence.join(", ")})` : ""

  return `* ${narrative} [confidence: ${signal.confidence}]${evidence}`
}

function formatMetric(value: number | null): string {
  return value === null ? "n/a" : `${value}s`
}
