import type { BehavioralSignalType } from "~/types/behavioral-signal"
import { BEHAVIORAL_SIGNALS } from "~/types/behavioral-signal"

/** User-facing insight labels — never expose internal signal names in UI */
export const INSIGHT_LABELS: Record<BehavioralSignalType, string> = {
  [BEHAVIORAL_SIGNALS.SHORT_READING_PHASE]: "Brief Reading Phase",
  [BEHAVIORAL_SIGNALS.LONG_READING_PHASE]: "Long Reading Phase",
  [BEHAVIORAL_SIGNALS.IMMEDIATE_CODING]: "Quick Start",
  [BEHAVIORAL_SIGNALS.FAST_CONVERGENCE]: "Fast Convergence",
  [BEHAVIORAL_SIGNALS.HEAVY_ITERATION]: "Heavy Iteration",
  [BEHAVIORAL_SIGNALS.TRIAL_AND_ERROR_LOOP]: "Trial and Error",
  [BEHAVIORAL_SIGNALS.APPROACH_ABANDONMENT]: "Approach Change",
  [BEHAVIORAL_SIGNALS.MULTIPLE_REWRITES]: "Multiple Revisions",
  [BEHAVIORAL_SIGNALS.SINGLE_BUG_FIX]: "Quick Recovery",
  [BEHAVIORAL_SIGNALS.REPEATED_FAILURE_LOOP]: "Implementation Struggle",
  [BEHAVIORAL_SIGNALS.RUNTIME_ERROR_RECOVERY]: "Runtime Recovery",
  [BEHAVIORAL_SIGNALS.COMPILATION_ERROR_RECOVERY]: "Syntax Recovery",
  [BEHAVIORAL_SIGNALS.EDGE_CASE_STRUGGLE]: "Edge Case Challenge",
  [BEHAVIORAL_SIGNALS.LATE_EDGE_CASE_DISCOVERY]: "Late Edge Case",
  [BEHAVIORAL_SIGNALS.EDITORIAL_DEPENDENCY]: "Editorial Reference",
  [BEHAVIORAL_SIGNALS.HINT_DEPENDENCY]: "Hint Reference",
  [BEHAVIORAL_SIGNALS.DIRECT_SOLUTION]: "Direct Solution",
  [BEHAVIORAL_SIGNALS.EXPERIMENTAL_EXPLORATION]: "Exploratory Approach"
}

export function getInsightLabel(signal: BehavioralSignalType): string {
  return INSIGHT_LABELS[signal] ?? "Learning Pattern"
}
