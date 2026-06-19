/**
 * Manual validation for learning source aggregation.
 * Run: npx tsx scripts/validate-learning-source-aggregation.ts
 */
import { EVENT_TYPES } from "../src/types/events"
import type { SessionEvent } from "../src/types/events"
import {
  aggregateLearningSourceVisits,
  aggregateLearningSources,
  validateLearningSourceAggregation
} from "../src/utils/learning-source-aggregation"

function event(type: SessionEvent["type"], timestamp: number, metadata?: Record<string, unknown>): SessionEvent {
  return {
    eventId: `evt-${timestamp}-${type}`,
    type,
    timestamp,
    metadata
  }
}

const fixtures: SessionEvent[] = [
  event(EVENT_TYPES.EDITORIAL_OPENED, 1000),
  event(EVENT_TYPES.EDITORIAL_CLOSED, 3406, { durationMs: 2406 }),
  event(EVENT_TYPES.SOLUTION_OPENED, 3407),
  event(EVENT_TYPES.SOLUTION_CLOSED, 18745, { durationMs: 15338 }),
  event(EVENT_TYPES.SOLUTION_OPENED, 2000),
  event(EVENT_TYPES.SOLUTION_OPENED, 3000),
  event(EVENT_TYPES.SOLUTION_CLOSED, 12000, { durationMs: 10000 }),
  event(EVENT_TYPES.DISCUSSION_OPENED, 30000),
  event(EVENT_TYPES.DISCUSSION_CLOSED, 39000, { durationMs: 9000 }),
  event(EVENT_TYPES.EDITORIAL_OPENED, 40000),
  event(EVENT_TYPES.EDITORIAL_CLOSED, 50000, { durationMs: 10000 })
]

const editorialSolutionFlow: SessionEvent[] = [
  event(EVENT_TYPES.EDITORIAL_OPENED, 1000),
  event(EVENT_TYPES.EDITORIAL_CLOSED, 3406, { durationMs: 2406 }),
  event(EVENT_TYPES.SOLUTION_OPENED, 5000),
  event(EVENT_TYPES.SOLUTION_CLOSED, 20338, { durationMs: 15338 })
]

const aggregated = aggregateLearningSources(fixtures)
const visits = aggregateLearningSourceVisits(fixtures)
const report = validateLearningSourceAggregation(fixtures)
const flowVisits = aggregateLearningSourceVisits(editorialSolutionFlow)
const flowAggregated = aggregateLearningSources(editorialSolutionFlow)

console.log("Aggregated learningSources:")
console.log(JSON.stringify(aggregated, null, 2))
console.log("")
console.log("Visit records:")
console.log(JSON.stringify(visits, null, 2))
console.log("")
console.log("Validation report:")
console.log(JSON.stringify(report, null, 2))

if (!report.matches) {
  console.error("Validation FAILED")
  process.exit(1)
}

if (flowVisits.length !== 2) {
  console.error("Expected 2 visit records for editorial→solution flow, got", flowVisits.length)
  process.exit(1)
}

if (flowAggregated.editorial.visits !== 1 || flowAggregated.solutions.visits !== 1) {
  console.error("Expected 1 editorial and 1 solutions visit in flow")
  process.exit(1)
}

const expected = {
  editorial: { visits: 2, timeMs: 12406 },
  solutions: { visits: 1, timeMs: 25338 },
  discussion: { visits: 1, timeMs: 9000 }
}

for (const source of ["editorial", "solutions", "discussion"] as const) {
  const got = aggregated[source]
  const want = expected[source]

  if (got.visits !== want.visits || got.timeMs !== want.timeMs) {
    console.error(`Expected ${source}`, want, "got", got)
    process.exit(1)
  }
}

console.log("Validation PASSED")
