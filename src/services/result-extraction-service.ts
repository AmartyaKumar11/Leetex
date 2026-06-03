import { RESULT_POLL_INTERVAL_MS, RESULT_POLL_MAX_ATTEMPTS } from "~/constants/signals"
import { sessionManager } from "~/services/session-manager"
import { EVENT_TYPES } from "~/types/events"
import type { ResultMetadata } from "~/types/results"
import { extractRunOrSubmitResult } from "~/utils/leetcode-results"

export class ResultExtractionService {
  async captureRunResult(): Promise<void> {
    const result = await this.pollForResult()

    if (!result) {
      return
    }

    await sessionManager.registerEvent(EVENT_TYPES.RUN_RESULT, {
      metadata: resultMetadataToRecord(result),
      skipSnapshot: true
    })

    await sessionManager.recordAttempt("RUN", result)
  }

  async captureSubmissionResult(): Promise<void> {
    const result = await this.pollForResult()

    if (!result) {
      return
    }

    await sessionManager.registerEvent(EVENT_TYPES.SUBMISSION_RESULT, {
      metadata: resultMetadataToRecord(result),
      skipSnapshot: true
    })

    await sessionManager.recordAttempt("SUBMIT", result)
  }

  private pollForResult(): Promise<ResultMetadata | null> {
    return new Promise((resolve) => {
      let attempts = 0

      const poll = () => {
        attempts += 1
        const result = extractRunOrSubmitResult()

        if (result) {
          resolve(result)
          return
        }

        if (attempts >= RESULT_POLL_MAX_ATTEMPTS) {
          resolve(null)
          return
        }

        window.setTimeout(poll, RESULT_POLL_INTERVAL_MS)
      }

      poll()
    })
  }
}

function resultMetadataToRecord(result: ResultMetadata): Record<string, unknown> {
  return {
    status: result.status,
    passed: result.passed,
    total: result.total
  }
}

export const resultExtractionService = new ResultExtractionService()
