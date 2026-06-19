import { EVENT_TYPES, type SessionEvent } from "~/types/events"
import type { Session } from "~/types/session"
import {
  createEmptyLearningSources,
  type LearningSourceId,
  type LearningSourceVisit,
  type LearningSources
} from "~/types/learning-source"

const LEARNING_SOURCE_IDS: LearningSourceId[] = ["editorial", "solutions", "discussion"]

const OPEN_EVENT_BY_SOURCE: Record<LearningSourceId, string> = {
  editorial: EVENT_TYPES.EDITORIAL_OPENED,
  solutions: EVENT_TYPES.SOLUTION_OPENED,
  discussion: EVENT_TYPES.DISCUSSION_OPENED
}

const CLOSE_EVENT_BY_SOURCE: Record<LearningSourceId, string> = {
  editorial: EVENT_TYPES.EDITORIAL_CLOSED,
  solutions: EVENT_TYPES.SOLUTION_CLOSED,
  discussion: EVENT_TYPES.DISCUSSION_CLOSED
}

export function withAggregatedLearningSources(session: Session): Session {
  const events = session.events ?? []

  return {
    ...session,
    learningSources: aggregateLearningSources(events),
    learningSourceVisits: aggregateLearningSourceVisits(events)
  }
}

export function aggregateLearningSourceVisits(events: SessionEvent[]): LearningSourceVisit[] {
  const visits: LearningSourceVisit[] = []
  const openStacks = createOpenStackMap()
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)

  for (const event of sorted) {
    const source = resolveLearningSourceFromEventType(event.type)

    if (!source) {
      continue
    }

    if (event.type === OPEN_EVENT_BY_SOURCE[source]) {
      openStacks[source].push(event.timestamp)
      continue
    }

    if (event.type !== CLOSE_EVENT_BY_SOURCE[source]) {
      continue
    }

    const openedAt = openStacks[source].pop()

    if (openedAt == null) {
      continue
    }

    const closedAt = event.timestamp
    const durationMs = readDurationMs(event.metadata) || Math.max(0, closedAt - openedAt)

    visits.push({
      source,
      openedAt,
      closedAt,
      durationMs
    })
  }

  return visits
}

export function aggregateLearningSources(events: SessionEvent[]): LearningSources {
  const stats = createEmptyLearningSources()
  const openDepth = createOpenDepthMap()

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)

  for (const event of sorted) {
    const source = resolveLearningSourceFromEventType(event.type)

    if (!source) {
      continue
    }

    if (event.type === OPEN_EVENT_BY_SOURCE[source]) {
      if (openDepth[source] === 0) {
        stats[source].visits += 1
      }

      openDepth[source] += 1
      continue
    }

    if (event.type === CLOSE_EVENT_BY_SOURCE[source]) {
      stats[source].timeMs += readDurationMs(event.metadata)

      if (openDepth[source] > 0) {
        openDepth[source] -= 1
      }
    }
  }

  return stats
}

export interface LearningSourceAggregationReport {
  aggregated: LearningSources
  visits: LearningSourceVisit[]
  raw: {
    openCounts: Record<LearningSourceId, number>
    closeCounts: Record<LearningSourceId, number>
    closeDurationMs: Record<LearningSourceId, number>
  }
  matches: boolean
  mismatches: string[]
}

export function validateLearningSourceAggregation(
  events: SessionEvent[]
): LearningSourceAggregationReport {
  const aggregated = aggregateLearningSources(events)
  const visits = aggregateLearningSourceVisits(events)
  const raw = {
    openCounts: createCountMap(),
    closeCounts: createCountMap(),
    closeDurationMs: createCountMap()
  }

  for (const event of events) {
    const source = resolveLearningSourceFromEventType(event.type)

    if (!source) {
      continue
    }

    if (event.type === OPEN_EVENT_BY_SOURCE[source]) {
      raw.openCounts[source] += 1
      continue
    }

    if (event.type === CLOSE_EVENT_BY_SOURCE[source]) {
      raw.closeCounts[source] += 1
      raw.closeDurationMs[source] += readDurationMs(event.metadata)
    }
  }

  const mismatches: string[] = []

  for (const source of LEARNING_SOURCE_IDS) {
    const distinctVisits = countDistinctOpenSessions(events, source)
    const visitRecords = visits.filter((visit) => visit.source === source)

    if (aggregated[source].visits !== distinctVisits) {
      mismatches.push(
        `${source}.visits aggregated=${aggregated[source].visits} expected=${distinctVisits} (raw OPEN=${raw.openCounts[source]})`
      )
    }

    if (aggregated[source].timeMs !== raw.closeDurationMs[source]) {
      mismatches.push(
        `${source}.timeMs aggregated=${aggregated[source].timeMs} expected=${raw.closeDurationMs[source]}`
      )
    }

    const visitDurationSum = visitRecords.reduce((sum, visit) => sum + visit.durationMs, 0)

    if (visitDurationSum !== raw.closeDurationMs[source]) {
      mismatches.push(
        `${source}.visitDurationSum=${visitDurationSum} expected=${raw.closeDurationMs[source]}`
      )
    }
  }

  return {
    aggregated,
    visits,
    raw,
    matches: mismatches.length === 0,
    mismatches
  }
}

function countDistinctOpenSessions(events: SessionEvent[], source: LearningSourceId): number {
  let depth = 0
  let visitCount = 0

  for (const event of [...events].sort((a, b) => a.timestamp - b.timestamp)) {
    if (event.type === OPEN_EVENT_BY_SOURCE[source]) {
      if (depth === 0) {
        visitCount += 1
      }

      depth += 1
      continue
    }

    if (event.type === CLOSE_EVENT_BY_SOURCE[source] && depth > 0) {
      depth -= 1
    }
  }

  return visitCount
}

function readDurationMs(metadata?: Record<string, unknown>): number {
  const value = metadata?.durationMs

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value))
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed))
    }
  }

  return 0
}

function createOpenDepthMap(): Record<LearningSourceId, number> {
  return {
    editorial: 0,
    solutions: 0,
    discussion: 0
  }
}

function createOpenStackMap(): Record<LearningSourceId, number[]> {
  return {
    editorial: [],
    solutions: [],
    discussion: []
  }
}

function createCountMap(): Record<LearningSourceId, number> {
  return {
    editorial: 0,
    solutions: 0,
    discussion: 0
  }
}

function resolveLearningSourceFromEventType(type: string): LearningSourceId | null {
  for (const source of LEARNING_SOURCE_IDS) {
    if (type === OPEN_EVENT_BY_SOURCE[source] || type === CLOSE_EVENT_BY_SOURCE[source]) {
      return source
    }
  }

  return null
}
