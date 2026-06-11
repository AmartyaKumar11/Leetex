import {
  confidenceAboveThreshold,
  confidenceBelowThreshold,
  boostWithEvidence,
  clampConfidence,
  patternConfidence
} from "~/behavioral/confidence"
import type { SessionAnalysisContext } from "~/behavioral/session-context"
import {
  findFailureThenAcceptedPair,
  findFirstAcceptedIndex,
  getConsecutiveFailureStreak,
  getEventTimestamp,
  secondsAfterEvent
} from "~/behavioral/session-context"
import {
  DEPENDENCY_WINDOW_SECONDS,
  DIRECT_SOLUTION_MAX_DURATION_SECONDS,
  DIRECT_SOLUTION_MAX_RUNS,
  EDGE_CASE_PASS_RATE_MIN,
  EXPERIMENTAL_MIN_RUNS,
  EXPERIMENTAL_MIN_SNAPSHOTS,
  FAST_CONVERGENCE_MAX_EXECUTIONS,
  HEAVY_ITERATION_MIN_RUNS,
  IMMEDIATE_CODING_MAX_SECONDS,
  LATE_EDGE_CASE_MIN_PRIOR_RUNS,
  LONG_READING_MIN_SECONDS,
  REPEATED_FAILURE_MIN_COUNT,
  SHORT_READING_MAX_SECONDS,
  SMALL_DELTA_SIMILARITY_MIN,
  TRIAL_ERROR_MIN_RUNS
} from "~/constants/behavioral-thresholds"
import { EVENT_TYPES } from "~/types/events"
import {
  BEHAVIORAL_SIGNALS,
  type BehavioralSignal,
  type BehavioralSignalType
} from "~/types/behavioral-signal"
import { now } from "~/utils/time"

type RuleEvaluator = (ctx: SessionAnalysisContext) => BehavioralSignal | null

export const SIGNAL_RULES: RuleEvaluator[] = [
  evaluateShortReadingPhase,
  evaluateLongReadingPhase,
  evaluateImmediateCoding,
  evaluateFastConvergence,
  evaluateHeavyIteration,
  evaluateTrialAndErrorLoop,
  evaluateApproachAbandonment,
  evaluateMultipleRewrites,
  evaluateSingleBugFix,
  evaluateRepeatedFailureLoop,
  evaluateRuntimeErrorRecovery,
  evaluateCompilationErrorRecovery,
  evaluateEdgeCaseStruggle,
  evaluateLateEdgeCaseDiscovery,
  evaluateEditorialDependency,
  evaluateHintDependency,
  evaluateDirectSolution,
  evaluateExperimentalExploration
]

function createSignal(
  signal: BehavioralSignalType,
  confidence: number,
  evidence: string[]
): BehavioralSignal {
  return {
    signal,
    confidence: clampConfidence(confidence),
    evidence,
    generatedAt: now()
  }
}

// --- Category 1: Reading Behavior ---

function evaluateShortReadingPhase(ctx: SessionAnalysisContext): BehavioralSignal | null {
  const t = ctx.metrics.timeToFirstEdit

  if (t === null || t >= SHORT_READING_MAX_SECONDS) {
    return null
  }

  return createSignal(
    BEHAVIORAL_SIGNALS.SHORT_READING_PHASE,
    confidenceBelowThreshold(t, SHORT_READING_MAX_SECONDS, 0.82),
    [`timeToFirstEdit=${t}s`, `threshold=<${SHORT_READING_MAX_SECONDS}s`]
  )
}

function evaluateLongReadingPhase(ctx: SessionAnalysisContext): BehavioralSignal | null {
  const t = ctx.metrics.timeToFirstEdit

  if (t === null || t <= LONG_READING_MIN_SECONDS) {
    return null
  }

  return createSignal(
    BEHAVIORAL_SIGNALS.LONG_READING_PHASE,
    confidenceAboveThreshold(t, LONG_READING_MIN_SECONDS, 0.8),
    [`timeToFirstEdit=${t}s`, `threshold=>${LONG_READING_MIN_SECONDS}s`]
  )
}

function evaluateImmediateCoding(ctx: SessionAnalysisContext): BehavioralSignal | null {
  const t = ctx.metrics.timeToFirstEdit

  if (t === null || t >= IMMEDIATE_CODING_MAX_SECONDS) {
    return null
  }

  return createSignal(
    BEHAVIORAL_SIGNALS.IMMEDIATE_CODING,
    confidenceBelowThreshold(t, IMMEDIATE_CODING_MAX_SECONDS, 0.85),
    [`timeToFirstEdit=${t}s`, `threshold=<${IMMEDIATE_CODING_MAX_SECONDS}s`]
  )
}

// --- Category 2: Iteration Behavior ---

function evaluateFastConvergence(ctx: SessionAnalysisContext): BehavioralSignal | null {
  const acceptedIdx = findFirstAcceptedIndex(ctx.executions)

  if (acceptedIdx < 0) {
    return null
  }

  const executionCount = acceptedIdx + 1

  if (executionCount > FAST_CONVERGENCE_MAX_EXECUTIONS) {
    return null
  }

  return createSignal(
    BEHAVIORAL_SIGNALS.FAST_CONVERGENCE,
    patternConfidence(1 - executionCount / (FAST_CONVERGENCE_MAX_EXECUTIONS + 1)),
    [
      `executionCount=${executionCount}`,
      `acceptedOnExecution=${executionCount}`,
      `threshold=<=${FAST_CONVERGENCE_MAX_EXECUTIONS}`
    ]
  )
}

function evaluateHeavyIteration(ctx: SessionAnalysisContext): BehavioralSignal | null {
  const runCount = ctx.metrics.totalRuns

  if (runCount < HEAVY_ITERATION_MIN_RUNS) {
    return null
  }

  return createSignal(
    BEHAVIORAL_SIGNALS.HEAVY_ITERATION,
    confidenceAboveThreshold(runCount, HEAVY_ITERATION_MIN_RUNS, 0.78),
    [`runCount=${runCount}`, `threshold=>=${HEAVY_ITERATION_MIN_RUNS}`]
  )
}

function evaluateTrialAndErrorLoop(ctx: SessionAnalysisContext): BehavioralSignal | null {
  const { totalRuns } = ctx.metrics
  const { majorRewriteCount, avgConsecutiveSnapshotSimilarity } = ctx

  if (totalRuns < TRIAL_ERROR_MIN_RUNS) {
    return null
  }

  if (majorRewriteCount > 0) {
    return null
  }

  if (
    avgConsecutiveSnapshotSimilarity === null ||
    avgConsecutiveSnapshotSimilarity < SMALL_DELTA_SIMILARITY_MIN
  ) {
    return null
  }

  const evidence = [
    `runCount=${totalRuns}`,
    `majorRewriteCount=0`,
    `avgSnapshotSimilarity=${avgConsecutiveSnapshotSimilarity.toFixed(2)}`,
    `smallDeltaThreshold=>=${SMALL_DELTA_SIMILARITY_MIN}`
  ]

  return createSignal(
    BEHAVIORAL_SIGNALS.TRIAL_AND_ERROR_LOOP,
    boostWithEvidence(0.82, evidence.length),
    evidence
  )
}

// --- Category 3: Rewrite Behavior ---

function evaluateApproachAbandonment(ctx: SessionAnalysisContext): BehavioralSignal | null {
  const rewrite = ctx.majorRewriteEvents[0]

  if (!rewrite) {
    return null
  }

  const similarity = rewrite.metadata?.similarity
  const evidence = ["MAJOR_REWRITE detected"]

  if (typeof similarity === "number") {
    evidence.push(`similarity=${similarity}`)
  }

  return createSignal(
    BEHAVIORAL_SIGNALS.APPROACH_ABANDONMENT,
    patternConfidence(0.9),
    evidence
  )
}

function evaluateMultipleRewrites(ctx: SessionAnalysisContext): BehavioralSignal | null {
  if (ctx.majorRewriteCount < 2) {
    return null
  }

  return createSignal(
    BEHAVIORAL_SIGNALS.MULTIPLE_REWRITES,
    confidenceAboveThreshold(ctx.majorRewriteCount, 2, 0.8),
    [`majorRewriteCount=${ctx.majorRewriteCount}`, "threshold=>=2"]
  )
}

// --- Category 4: Debugging Behavior ---

const RECOVERABLE_FAILURES = [
  "Wrong Answer",
  "Runtime Error",
  "Compilation Error",
  "Time Limit Exceeded",
  "Memory Limit Exceeded"
]

function evaluateSingleBugFix(ctx: SessionAnalysisContext): BehavioralSignal | null {
  const pair = findFailureThenAcceptedPair(ctx.executions, RECOVERABLE_FAILURES)

  if (!pair) {
    return null
  }

  return createSignal(
    BEHAVIORAL_SIGNALS.SINGLE_BUG_FIX,
    patternConfidence(0.88),
    [
      `failureStatus=${pair.failure.status}`,
      `recoveryStatus=${pair.recovery.status}`,
      "pattern=failure→accepted on next execution"
    ]
  )
}

function evaluateRepeatedFailureLoop(ctx: SessionAnalysisContext): BehavioralSignal | null {
  const streak = getConsecutiveFailureStreak(ctx.executions)

  if (streak < REPEATED_FAILURE_MIN_COUNT) {
    return null
  }

  return createSignal(
    BEHAVIORAL_SIGNALS.REPEATED_FAILURE_LOOP,
    confidenceAboveThreshold(streak, REPEATED_FAILURE_MIN_COUNT, 0.85),
    [
      `consecutiveFailures=${streak}`,
      `threshold=>=${REPEATED_FAILURE_MIN_COUNT}`,
      "pattern=repeated non-accepted executions"
    ]
  )
}

function evaluateRuntimeErrorRecovery(ctx: SessionAnalysisContext): BehavioralSignal | null {
  const pair = findFailureThenAcceptedPair(ctx.executions, ["Runtime Error"])

  if (!pair) {
    return null
  }

  return createSignal(
    BEHAVIORAL_SIGNALS.RUNTIME_ERROR_RECOVERY,
    patternConfidence(0.9),
    ["failureStatus=Runtime Error", "recoveryStatus=Accepted"]
  )
}

function evaluateCompilationErrorRecovery(ctx: SessionAnalysisContext): BehavioralSignal | null {
  const pair = findFailureThenAcceptedPair(ctx.executions, ["Compilation Error"])

  if (!pair) {
    return null
  }

  return createSignal(
    BEHAVIORAL_SIGNALS.COMPILATION_ERROR_RECOVERY,
    patternConfidence(0.9),
    ["failureStatus=Compilation Error", "recoveryStatus=Accepted"]
  )
}

// --- Category 5: Edge Case Behavior ---

function evaluateEdgeCaseStruggle(ctx: SessionAnalysisContext): BehavioralSignal | null {
  for (const attempt of ctx.executions) {
    if (attempt.status === "Accepted") {
      continue
    }

    if (attempt.passed == null || attempt.total == null || attempt.total === 0) {
      continue
    }

    const rate = attempt.passed / attempt.total

    if (rate >= EDGE_CASE_PASS_RATE_MIN) {
      return createSignal(
        BEHAVIORAL_SIGNALS.EDGE_CASE_STRUGGLE,
        patternConfidence(rate),
        [
          `status=${attempt.status}`,
          `passed=${attempt.passed}`,
          `total=${attempt.total}`,
          `passRate=${(rate * 100).toFixed(1)}%`,
          `threshold=>=${EDGE_CASE_PASS_RATE_MIN * 100}%`
        ]
      )
    }
  }

  return null
}

function evaluateLateEdgeCaseDiscovery(ctx: SessionAnalysisContext): BehavioralSignal | null {
  let highPassRuns = 0

  for (let i = 0; i < ctx.executions.length; i += 1) {
    const attempt = ctx.executions[i]
    const rate =
      attempt.passed != null && attempt.total != null && attempt.total > 0
        ? attempt.passed / attempt.total
        : null

    const isHighPass = rate !== null && rate >= EDGE_CASE_PASS_RATE_MIN

    if (isHighPass && attempt.status !== "Accepted") {
      if (highPassRuns >= LATE_EDGE_CASE_MIN_PRIOR_RUNS) {
        return createSignal(
          BEHAVIORAL_SIGNALS.LATE_EDGE_CASE_DISCOVERY,
          patternConfidence(0.85),
          [
            `priorHighPassRuns=${highPassRuns}`,
            `failureStatus=${attempt.status}`,
            `passed=${attempt.passed}`,
            `total=${attempt.total}`,
            "pattern=high pass rate runs then failure near acceptance"
          ]
        )
      }
    }

    if (isHighPass) {
      highPassRuns += 1
    }
  }

  return null
}

// --- Category 6: Dependency Behavior ---

function evaluateEditorialDependency(ctx: SessionAnalysisContext): BehavioralSignal | null {
  const editorialTs = getEventTimestamp(ctx, EVENT_TYPES.EDITORIAL_OPENED)

  if (editorialTs === null) {
    return null
  }

  const acceptedIdx = findFirstAcceptedIndex(ctx.executions)

  if (acceptedIdx < 0) {
    return null
  }

  const accepted = ctx.executions[acceptedIdx]
  const secondsAfter = secondsAfterEvent(ctx, EVENT_TYPES.EDITORIAL_OPENED, accepted.timestamp)

  if (secondsAfter === null || secondsAfter > DEPENDENCY_WINDOW_SECONDS) {
    return null
  }

  return createSignal(
    BEHAVIORAL_SIGNALS.EDITORIAL_DEPENDENCY,
    confidenceBelowThreshold(secondsAfter, DEPENDENCY_WINDOW_SECONDS, 0.8),
    [
      "EDITORIAL_OPENED before acceptance",
      `secondsToAcceptance=${secondsAfter}`,
      `window=<=${DEPENDENCY_WINDOW_SECONDS}s`
    ]
  )
}

function evaluateHintDependency(ctx: SessionAnalysisContext): BehavioralSignal | null {
  const hintTs = getEventTimestamp(ctx, "HINT_OPENED")

  if (hintTs === null) {
    return null
  }

  const acceptedIdx = findFirstAcceptedIndex(ctx.executions)

  if (acceptedIdx < 0) {
    return null
  }

  const accepted = ctx.executions[acceptedIdx]
  const secondsAfter = secondsAfterEvent(ctx, "HINT_OPENED", accepted.timestamp)

  if (secondsAfter === null || secondsAfter > DEPENDENCY_WINDOW_SECONDS) {
    return null
  }

  return createSignal(
    BEHAVIORAL_SIGNALS.HINT_DEPENDENCY,
    confidenceBelowThreshold(secondsAfter, DEPENDENCY_WINDOW_SECONDS, 0.8),
    [
      "HINT_OPENED before acceptance",
      `secondsToAcceptance=${secondsAfter}`,
      `window=<=${DEPENDENCY_WINDOW_SECONDS}s`
    ]
  )
}

// --- Category 7: Solution Confidence ---

function evaluateDirectSolution(ctx: SessionAnalysisContext): BehavioralSignal | null {
  const { totalRuns, sessionDuration } = ctx.metrics
  const acceptedIdx = findFirstAcceptedIndex(ctx.executions)

  if (acceptedIdx < 0) {
    return null
  }

  if (totalRuns > DIRECT_SOLUTION_MAX_RUNS) {
    return null
  }

  if (ctx.majorRewriteCount > 0) {
    return null
  }

  if (sessionDuration > DIRECT_SOLUTION_MAX_DURATION_SECONDS) {
    return null
  }

  const evidence = [
    `runCount=${totalRuns}`,
    `majorRewriteCount=0`,
    `sessionDuration=${sessionDuration}s`,
    `acceptedOnExecution=${acceptedIdx + 1}`
  ]

  return createSignal(
    BEHAVIORAL_SIGNALS.DIRECT_SOLUTION,
    boostWithEvidence(0.86, evidence.length),
    evidence
  )
}

function evaluateExperimentalExploration(ctx: SessionAnalysisContext): BehavioralSignal | null {
  const { totalRuns, totalSnapshots } = ctx.metrics
  const { majorRewriteCount } = ctx

  const hasEnoughRuns = totalRuns >= EXPERIMENTAL_MIN_RUNS
  const hasEnoughSnapshots = totalSnapshots >= EXPERIMENTAL_MIN_SNAPSHOTS
  const hasRewrites = majorRewriteCount >= 1

  if (!hasEnoughRuns || !hasEnoughSnapshots) {
    return null
  }

  if (!hasRewrites && totalRuns < EXPERIMENTAL_MIN_RUNS + 2) {
    return null
  }

  const evidence = [
    `runCount=${totalRuns}`,
    `snapshotCount=${totalSnapshots}`,
    `majorRewriteCount=${majorRewriteCount}`,
    "pattern=high exploration activity"
  ]

  return createSignal(
    BEHAVIORAL_SIGNALS.EXPERIMENTAL_EXPLORATION,
    boostWithEvidence(0.8, evidence.length),
    evidence
  )
}
