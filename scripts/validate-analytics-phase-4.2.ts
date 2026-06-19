/**
 * Phase 4.2 validation — ReplayGenerator + FeatureExtractor
 * Run: npx tsx scripts/validate-analytics-phase-4.2.ts
 */
import { generateReplay } from "../src/analytics/replay-generator"
import { extractBehavioralFeatures } from "../src/analytics/feature-extractor"
import { EVENT_TYPES } from "../src/types/events"
import type { SessionEvent } from "../src/types/events"
import { createEmptyLearningSources } from "../src/types/learning-source"
import { createEmptySessionMetrics } from "../src/types/metrics"
import type { Session } from "../src/types/session"

function event(
  type: SessionEvent["type"],
  timestamp: number,
  metadata?: Record<string, unknown>
): SessionEvent {
  return {
    eventId: `evt-${timestamp}-${type}`,
    type,
    timestamp,
    metadata
  }
}

const startTime = 1_781_855_000_000

const exampleSession: Session = {
  sessionId: "sess-example-4.2",
  questionTitle: "String to Integer (atoi)",
  questionSlug: "string-to-integer-atoi",
  difficulty: "Medium",
  startTime,
  endTime: startTime + 1_092_000,
  lastActivityTimestamp: startTime + 692_000,
  status: "completed",
  events: [
    event(EVENT_TYPES.QUESTION_OPENED, startTime),
    event(EVENT_TYPES.FIRST_EDIT, startTime + 3_000),
    event(EVENT_TYPES.LANGUAGE_CHANGED, startTime + 5_000, {
      oldLanguage: "python",
      newLanguage: "python3"
    }),
    event(EVENT_TYPES.FIRST_RUN, startTime + 120_000),
    event(EVENT_TYPES.RUN_CODE, startTime + 180_000),
    event(EVENT_TYPES.RUN_RESULT, startTime + 185_000, { status: "Wrong Answer" }),
    event(EVENT_TYPES.EDITORIAL_OPENED, startTime + 265_000),
    event(EVENT_TYPES.EDITORIAL_CLOSED, startTime + 267_406, { durationMs: 2406 }),
    event(EVENT_TYPES.MAJOR_REWRITE, startTime + 497_000, { similarity: 0.31 }),
    event(EVENT_TYPES.FIRST_SUBMIT, startTime + 680_000),
    event(EVENT_TYPES.SUBMIT, startTime + 680_500),
    event(EVENT_TYPES.SUBMISSION_RESULT, startTime + 692_000, {
      status: "Accepted",
      runtime: "4 ms",
      memory: "17.2 MB"
    })
  ],
  snapshots: [],
  attemptHistory: [
    {
      type: "RUN",
      timestamp: startTime + 185_000,
      status: "Wrong Answer",
      passed: 8,
      total: 10
    },
    {
      type: "RUN",
      timestamp: startTime + 320_000,
      status: "Compilation Error",
      errorText: "SyntaxError",
      errorCategory: "syntax"
    },
    {
      type: "SUBMIT",
      timestamp: startTime + 692_000,
      status: "Accepted",
      runtime: "4 ms",
      memory: "17.2 MB"
    }
  ],
  metrics: createEmptySessionMetrics(),
  learningSources: {
    ...createEmptyLearningSources(),
    editorial: { visits: 1, timeMs: 2406 }
  },
  learningSourceVisits: []
}

const timeline = generateReplay(exampleSession)
const features = extractBehavioralFeatures(exampleSession)

console.log("Replay timeline:")
console.log(JSON.stringify(timeline, null, 2))
console.log("")
console.log("Behavioral features (solving, debugging, rewrites, learning):")
console.log(
  JSON.stringify(
    {
      solving: features.solving,
      debugging: features.debugging,
      rewrites: features.rewrites,
      learning: features.learning
    },
    null,
    2
  )
)

const checks: Array<[string, boolean]> = [
  ["timeline has Question Opened", timeline[0]?.event === "Question Opened"],
  ["timeline has Wrong Answer as ERROR", timeline.some((e) => e.event === "Wrong Answer" && e.category === "ERROR")],
  ["timeline has Editorial Opened", timeline.some((e) => e.event === "Editorial Opened")],
  ["timeline has Accepted", timeline.some((e) => e.event === "Accepted")],
  ["solving.timeToFirstEdit = 3000", features.solving.timeToFirstEdit === 3000],
  ["solving.totalRuns = 1", features.solving.totalRuns === 1],
  ["debugging.wrongAnswers = 1", features.debugging.wrongAnswers === 1],
  ["debugging.compileErrors = 1", features.debugging.compileErrors === 1],
  ["rewrites.majorRewrites = 1", features.rewrites.majorRewrites === 1],
  ["rewrites.rewriteBeforeAccepted = true", features.rewrites.rewriteBeforeAccepted === true],
  ["learning.editorialVisits = 1", features.learning.editorialVisits === 1]
]

const failed = checks.filter(([, ok]) => !ok)

if (failed.length > 0) {
  console.error("")
  console.error("Validation FAILED:")
  for (const [label] of failed) {
    console.error(`  - ${label}`)
  }
  process.exit(1)
}

console.log("")
console.log("Validation PASSED")
