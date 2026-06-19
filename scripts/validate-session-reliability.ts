/**
 * Session reliability validation — timeout boundary + effective end time
 * Run: npx tsx scripts/validate-session-reliability.ts
 */
import { SESSION_TIMEOUT_MS } from "../src/constants/session"
import { EVENT_TYPES } from "../src/types/events"
import { createEmptyLearningSources } from "../src/types/learning-source"
import { createEmptySessionMetrics } from "../src/types/metrics"
import type { Session } from "../src/types/session"
import {
  getEffectiveEndTime,
  getLatestTimestampInSession,
  isSessionTimedOut,
  resolveLastActivityTimestamp
} from "../src/utils/session-time"

const startTime = 1_000_000

function buildSession(overrides: Partial<Session> = {}): Session {
  return {
    sessionId: "sess-reliability",
    questionTitle: "Two Sum",
    questionSlug: "two-sum",
    difficulty: "Easy",
    startTime,
    endTime: null,
    lastActivityTimestamp: startTime + 600_000,
    status: "active",
    events: [
      {
        eventId: "evt-1",
        type: EVENT_TYPES.QUESTION_OPENED,
        timestamp: startTime
      },
      {
        eventId: "evt-2",
        type: EVENT_TYPES.SUBMISSION_RESULT,
        timestamp: startTime + 600_000,
        metadata: { status: "Accepted" }
      },
      {
        eventId: "evt-3",
        type: EVENT_TYPES.EDITORIAL_OPENED,
        timestamp: startTime + 610_000
      }
    ],
    snapshots: [],
    attemptHistory: [
      {
        type: "SUBMIT",
        timestamp: startTime + 600_000,
        status: "Accepted"
      }
    ],
    metrics: createEmptySessionMetrics(),
    learningSources: createEmptyLearningSources(),
    learningSourceVisits: [],
    ...overrides
  }
}

console.log("=== Bug 2: getEffectiveEndTime ===")

const activeExport = buildSession()
const effectiveEnd = getEffectiveEndTime(activeExport)

console.log("endTime:", activeExport.endTime)
console.log("latest timestamp:", getLatestTimestampInSession(activeExport))
console.log("effective end:", effectiveEnd)
console.log("duration ms:", effectiveEnd - activeExport.startTime)

if (effectiveEnd !== startTime + 610_000) {
  console.error("Expected effective end at editorial open timestamp")
  process.exit(1)
}

console.log("")
console.log("=== Bug 1: Session timeout boundary ===")

const lastActivity = startTime + 600_000
const withinTimeout = lastActivity + 10 * 60 * 1000
const beyondTimeout = lastActivity + SESSION_TIMEOUT_MS + 1

console.log("Scenario A — Accepted → Editorial within 30 min:")
console.log(
  "  timed out?",
  isSessionTimedOut(lastActivity, withinTimeout, SESSION_TIMEOUT_MS),
  "(expected false — same session continues)"
)

console.log("Scenario B — User returns after 31+ min idle:")
console.log(
  "  timed out?",
  isSessionTimedOut(lastActivity, beyondTimeout, SESSION_TIMEOUT_MS),
  "(expected true — end old session, start new)"
)

if (isSessionTimedOut(lastActivity, withinTimeout, SESSION_TIMEOUT_MS)) {
  console.error("Scenario A should NOT time out")
  process.exit(1)
}

if (!isSessionTimedOut(lastActivity, beyondTimeout, SESSION_TIMEOUT_MS)) {
  console.error("Scenario B should time out")
  process.exit(1)
}

const legacySession = buildSession({ lastActivityTimestamp: undefined as unknown as number })
const resolved = resolveLastActivityTimestamp(legacySession)

if (resolved !== startTime + 610_000) {
  console.error("Legacy session should backfill lastActivityTimestamp from events")
  process.exit(1)
}

console.log("")
console.log("Validation PASSED")
