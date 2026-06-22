import { EVENT_TYPES } from "~/types/events"
import { createEmptyLearningSources } from "~/types/learning-source"
import {
  createPlaceholderBehavioralFeatures,
  type BehavioralFeatures
} from "~/types/session-analysis-export"
import type { Session } from "~/types/session"
import type { AttemptRecord } from "~/types/attempt"
import type { ResultStatus } from "~/types/results"

export function extractBehavioralFeatures(session: Session): BehavioralFeatures {
  const placeholder = createPlaceholderBehavioralFeatures()

  return {
    ...placeholder,
    solving: extractSolvingFeatures(session),
    debugging: extractDebuggingFeatures(session),
    rewrites: extractRewriteFeatures(session),
    learning: extractLearningFeatures(session)
  }
}

export class FeatureExtractor {
  extract(session: Session): BehavioralFeatures {
    return extractBehavioralFeatures(session)
  }
}

export const featureExtractor = new FeatureExtractor()

function extractSolvingFeatures(session: Session): BehavioralFeatures["solving"] {
  const events = session.events ?? []

  return {
    timeToFirstEdit: findRelativeMs(events, session.startTime, EVENT_TYPES.FIRST_EDIT),
    timeToFirstRun: findRelativeMs(events, session.startTime, EVENT_TYPES.FIRST_RUN),
    timeToFirstSubmit: findRelativeMs(events, session.startTime, EVENT_TYPES.FIRST_SUBMIT),
    totalRuns: countEvents(events, EVENT_TYPES.RUN_CODE),
    totalSubmissions: countEvents(events, EVENT_TYPES.SUBMIT)
  }
}

function extractDebuggingFeatures(session: Session): BehavioralFeatures["debugging"] {
  const attempts = [...(session.attemptHistory ?? [])].sort((a, b) => a.timestamp - b.timestamp)

  let compileErrors = 0
  let runtimeErrors = 0
  let wrongAnswers = 0
  const compileErrorCategories: string[] = []
  const runtimeErrorCategories: string[] = []
  const seenCompileCategories = new Set<string>()
  const seenRuntimeCategories = new Set<string>()

  for (const attempt of attempts) {
    switch (attempt.status) {
      case "Compilation Error":
        compileErrors += 1
        trackCategory(attempt, compileErrorCategories, seenCompileCategories)
        break
      case "Runtime Error":
        runtimeErrors += 1
        trackCategory(attempt, runtimeErrorCategories, seenRuntimeCategories)
        break
      case "Wrong Answer":
        wrongAnswers += 1
        break
      default:
        break
    }
  }

  return {
    compileErrors,
    runtimeErrors,
    wrongAnswers,
    compileErrorCategories,
    runtimeErrorCategories
  }
}

function extractRewriteFeatures(session: Session): BehavioralFeatures["rewrites"] {
  const events = [...(session.events ?? [])]
    .filter((event) => event.type === EVENT_TYPES.MAJOR_REWRITE)
    .sort((a, b) => a.timestamp - b.timestamp)

  const firstRewrite = events[0] ?? null
  const acceptedAt = findFirstAcceptedTimestamp(session)

  return {
    majorRewrites: events.length,
    firstRewriteAt: firstRewrite?.timestamp ?? null,
    rewriteBeforeAccepted:
      firstRewrite != null &&
      acceptedAt != null &&
      firstRewrite.timestamp < acceptedAt
  }
}

function extractLearningFeatures(session: Session): BehavioralFeatures["learning"] {
  const sources = session.learningSources ?? createEmptyLearningSources()

  return {
    editorialVisits: sources.editorial.visits,
    editorialTimeMs: sources.editorial.timeMs,
    solutionVisits: sources.solutions.visits,
    solutionTimeMs: sources.solutions.timeMs,
    discussionVisits: sources.discussion.visits,
    discussionTimeMs: sources.discussion.timeMs
  }
}

function findRelativeMs(
  events: Session["events"],
  sessionStart: number,
  type: string
): number | null {
  const event = events.find((item) => item.type === type)

  if (!event) {
    return null
  }

  return Math.max(0, event.timestamp - sessionStart)
}

function countEvents(events: Session["events"], type: string): number {
  return events.filter((item) => item.type === type).length
}

function trackCategory(
  attempt: AttemptRecord,
  categories: string[],
  seen: Set<string>
): void {
  const category = attempt.errorCategory?.trim()

  if (!category || seen.has(category)) {
    return
  }

  seen.add(category)
  categories.push(category)
}

function findFirstAcceptedTimestamp(session: Session): number | null {
  for (const event of [...(session.events ?? [])].sort((a, b) => a.timestamp - b.timestamp)) {
    if (event.type === EVENT_TYPES.SUBMISSION_RESULT && readResultStatus(event.metadata) === "Accepted") {
      return event.timestamp
    }
  }

  for (const attempt of [...(session.attemptHistory ?? [])].sort((a, b) => a.timestamp - b.timestamp)) {
    if (attempt.type === "SUBMIT" && attempt.status === "Accepted") {
      return attempt.timestamp
    }
  }

  return null
}

function readResultStatus(metadata?: Record<string, unknown>): ResultStatus | null {
  const value = metadata?.status

  if (typeof value === "string") {
    return value as ResultStatus
  }

  return null
}
