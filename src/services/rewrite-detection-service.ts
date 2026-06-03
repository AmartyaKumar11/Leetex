import { MAJOR_REWRITE_SIMILARITY_THRESHOLD } from "~/constants/signals"
import { sessionManager } from "~/services/session-manager"
import { EVENT_TYPES } from "~/types/events"
import type { Snapshot } from "~/types/snapshot"
import { computeCodeSimilarity } from "~/utils/code-similarity"

export class RewriteDetectionService {
  evaluateSnapshot(snapshot: Snapshot): void {
    const session = sessionManager.getCurrentSession()

    if (!session || session.snapshots.length < 2) {
      return
    }

    const previous = session.snapshots[session.snapshots.length - 2]
    const similarity = computeCodeSimilarity(previous.code, snapshot.code)

    if (similarity >= MAJOR_REWRITE_SIMILARITY_THRESHOLD) {
      return
    }

    void sessionManager.registerEvent(EVENT_TYPES.MAJOR_REWRITE, {
      metadata: { similarity: roundSimilarity(similarity) },
      skipSnapshot: true
    })
  }
}

function roundSimilarity(value: number): number {
  return Math.round(value * 100) / 100
}

export const rewriteDetectionService = new RewriteDetectionService()
