import {
  RESULT_EXTRACTION_TIMEOUT_MS,
  RESULT_MAX_RETRIES,
  RESULT_RETRY_INTERVAL_MS
} from "~/constants/result-extraction"
import { sessionManager } from "~/services/session-manager"
import { EVENT_TYPES } from "~/types/events"
import {
  createEmptyResultData,
  isResultDataEnriched,
  mergeResultData,
  resultDataToRecord,
  type ResultData
} from "~/types/results"
import {
  extractResultDataFromDom,
  findResultContainers,
  RESULT_CONTAINER_SELECTORS
} from "~/utils/leetcode-result-extractor"
import { resultDebugLog, resultDebugWarn } from "~/utils/result-extraction-debug"

type CaptureKind = "run" | "submit"

interface PendingCapture {
  kind: CaptureKind
  abortController: AbortController
}

export class ResultExtractionService {
  private pending: PendingCapture | null = null

  async captureRunResult(): Promise<void> {
    await this.capture("run", EVENT_TYPES.RUN_RESULT)
  }

  async captureSubmissionResult(): Promise<void> {
    await this.capture("submit", EVENT_TYPES.SUBMISSION_RESULT)
  }

  private async capture(
    kind: CaptureKind,
    eventType: typeof EVENT_TYPES.RUN_RESULT | typeof EVENT_TYPES.SUBMISSION_RESULT
  ): Promise<void> {
    this.cancelPendingCapture()

    const abortController = new AbortController()
    this.pending = { kind, abortController }

    resultDebugLog("Observer Started", { kind, selectors: RESULT_CONTAINER_SELECTORS })

    const result = await this.waitForResultData(abortController.signal)

    if (abortController.signal.aborted) {
      resultDebugLog("Capture Aborted", { kind })
      return
    }

    this.pending = null

    resultDebugLog("Extraction Success", { kind, result })

    await sessionManager.registerEvent(eventType, {
      metadata: resultDataToRecord(result),
      skipSnapshot: true
    })

    await sessionManager.recordAttempt(kind === "run" ? "RUN" : "SUBMIT", result)
  }

  private cancelPendingCapture(): void {
    if (this.pending) {
      this.pending.abortController.abort()
      this.pending = null
    }
  }

  private waitForResultData(signal: AbortSignal): Promise<ResultData> {
    return new Promise((resolve) => {
      let best: ResultData | null = null
      let attempts = 0
      let finished = false
      const startedAt = Date.now()

      const finish = (result: ResultData, reason: string) => {
        if (finished) {
          return
        }

        finished = true
        cleanup()

        resultDebugLog(reason, result)
        resolve(result)
      }

      const tryExtract = () => {
        if (finished || signal.aborted) {
          return
        }

        attempts += 1
        const extracted = extractResultDataFromDom()

        resultDebugLog("Extraction Attempt", {
          attempt: attempts,
          extracted
        })

        if (extracted) {
          best = mergeResultData(best, extracted)
        }

        const elapsed = Date.now() - startedAt
        const hasStatus = best !== null && best.status !== "Unknown"

        if (hasStatus && best && isResultDataEnriched(best)) {
          finish(best, "Extraction Complete (enriched)")
          return
        }

        if (hasStatus && best && attempts >= RESULT_MAX_RETRIES) {
          finish(best, "Extraction Complete (status + max retries)")
          return
        }

        if (elapsed >= RESULT_EXTRACTION_TIMEOUT_MS) {
          if (best && hasStatus) {
            finish(best, "Timeout (status found)")
          } else {
            resultDebugWarn("Timeout", { attempts, best })
            finish(best ?? createEmptyResultData("Unknown"), "Timeout (no status)")
          }
        }
      }

      const observers: MutationObserver[] = []

      const attachObservers = () => {
        const containers = findResultContainers()
        const observed = new Set<Element>()

        for (const container of containers) {
          if (observed.has(container)) {
            continue
          }

          observed.add(container)

          const observer = new MutationObserver(() => {
            resultDebugLog("DOM Updated", { container: container.tagName })
            tryExtract()
          })

          observer.observe(container, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true
          })

          observers.push(observer)
        }

        if (observed.size === 0) {
          const fallbackObserver = new MutationObserver(() => {
            resultDebugLog("DOM Updated", { container: "document.body" })
            tryExtract()
          })

          fallbackObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
          })

          observers.push(fallbackObserver)
        }
      }

      const retryTimer = window.setInterval(() => {
        tryExtract()
      }, RESULT_RETRY_INTERVAL_MS)

      const timeoutTimer = window.setTimeout(() => {
        tryExtract()
      }, RESULT_EXTRACTION_TIMEOUT_MS)

      const cleanup = () => {
        clearInterval(retryTimer)
        clearTimeout(timeoutTimer)

        for (const observer of observers) {
          observer.disconnect()
        }
      }

      signal.addEventListener("abort", () => {
        if (!finished) {
          finished = true
          cleanup()
        }
      })

      attachObservers()
      tryExtract()
    })
  }
}

export const resultExtractionService = new ResultExtractionService()
