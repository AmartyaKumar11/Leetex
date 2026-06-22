import { ANALYTICS_THRESHOLDS } from "~/analytics/analytics-thresholds"
import { isSessionAccepted } from "~/analytics/session-status"
import {
  SessionClassification,
  type BehavioralFeatures
} from "~/types/session-analysis-export"
import type { Session } from "~/types/session"

export function classifySession(
  session: Session,
  features: BehavioralFeatures
): SessionClassification[] {
  const classifications: SessionClassification[] = []
  const accepted = isSessionAccepted(session)
  const { learning, debugging, rewrites } = features

  if (accepted) {
    if (
      learning.editorialVisits === 0 &&
      learning.solutionVisits === 0 &&
      learning.discussionVisits === 0
    ) {
      classifications.push(SessionClassification.SELF_SOLVED)
    }

    if (learning.editorialVisits > 0) {
      classifications.push(SessionClassification.EDITORIAL_ASSISTED)
    }

    if (learning.solutionVisits > 0) {
      classifications.push(SessionClassification.SOLUTION_ASSISTED)
    }

    if (learning.discussionVisits > 0) {
      classifications.push(SessionClassification.DISCUSSION_ASSISTED)
    }
  }

  const debugIssueCount =
    debugging.compileErrors + debugging.runtimeErrors + debugging.wrongAnswers

  if (debugIssueCount >= ANALYTICS_THRESHOLDS.DEBUG_HEAVY) {
    classifications.push(SessionClassification.DEBUG_HEAVY)
  }

  if (rewrites.majorRewrites >= ANALYTICS_THRESHOLDS.REWRITE_HEAVY) {
    classifications.push(SessionClassification.REWRITE_HEAVY)
  }

  return classifications
}

export class ClassificationEngine {
  classify(session: Session, features: BehavioralFeatures): SessionClassification[] {
    return classifySession(session, features)
  }
}

export const classificationEngine = new ClassificationEngine()
