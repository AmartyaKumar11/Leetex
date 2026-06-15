import {
  RESULT_EXTRACTION_TIMEOUT_MS,
  RESULT_RETRY_INTERVAL_MS
} from "~/constants/result-extraction"
import { sessionManager } from "~/services/session-manager"
import { EVENT_TYPES } from "~/types/events"
import {
  createEmptyResultData,
  isExtractionComplete,
  isErrorResultStatus,
  mergeResultData,
  resultDataToRecord,
  type ResultData
} from "~/types/results"
import {
  extractResultDataFromDom,
  findResultContainers,
  RESULT_CONTAINER_SELECTORS
} from "~/utils/leetcode-result-extractor"
import { resultDebugField, resultDebugLog, resultDebugWarn } from "~/utils/result-extraction-debug"
import {
  beginResultDiagnostics,
  endResultDiagnostics,
  evaluateAndLogRuleFailures,
  setDiagnosticAttempt
} from "~/utils/result-extraction-diagnostics"

type CaptureKind = "run" | "submit"

interface PendingCapture {
  kind: CaptureKind
  abortController: AbortController
}

export class ResultExtractionService {
  private pending: PendingCapture | null = null
  private lastCaptureKey: string | null = null
  private lastCaptureAt = 0

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

    resultDebugLog("Observer started", { kind, selectors: RESULT_CONTAINER_SELECTORS })

    beginResultDiagnostics(`${kind}-${Date.now()}`, kind)

    const result = await this.waitForResultData(abortController.signal, kind)

    if (abortController.signal.aborted) {
      resultDebugLog("Capture aborted", { kind })
      endResultDiagnostics(createEmptyResultData("Unknown"), "Capture aborted")
      return
    }

    this.pending = null

    if (this.isDuplicateCapture(result)) {
      resultDebugLog("Duplicate capture skipped", { kind, status: result.status })
      return
    }

    this.rememberCapture(result)

    resultDebugLog("Extraction success", { kind, result })

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

  private isDuplicateCapture(result: ResultData): boolean {
    const key = this.buildCaptureKey(result)
    const now = Date.now()

    if (this.lastCaptureKey === key && now - this.lastCaptureAt < 1500) {
      return true
    }

    return false
  }

  private rememberCapture(result: ResultData): void {
    this.lastCaptureKey = this.buildCaptureKey(result)
    this.lastCaptureAt = Date.now()
  }

  private buildCaptureKey(result: ResultData): string {
    return [
      result.status,
      result.passed ?? "",
      result.total ?? "",
      result.failedInput ?? "",
      result.actualOutput ?? "",
      result.expectedOutput ?? "",
      result.errorText ?? "",
      result.errorCategory ?? "",
      result.runtime ?? "",
      result.memory ?? ""
    ].join("|")
  }

  private waitForResultData(
    signal: AbortSignal,
    expectedSource: CaptureKind
  ): Promise<ResultData> {
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

        if (isExtractionComplete(result)) {
          resultDebugField("Extraction Complete", {
            status: result.status,
            complete: true,
            reason
          })
        } else if (isErrorResultStatus(result.status)) {
          resultDebugWarn("Extraction incomplete — missing errorText", result)
        }

        endResultDiagnostics(result, reason)
        resultDebugLog(reason, result)
        resolve(result)
      }

      const tryExtract = () => {
        if (finished || signal.aborted) {
          return
        }

        attempts += 1
        setDiagnosticAttempt(attempts)

        const extracted = extractResultDataFromDom(expectedSource)

        resultDebugLog("Extraction attempt", {
          attempt: attempts,
          extracted
        })

        if (extracted) {
          best = mergeResultData(best, extracted)
        }

        const current = best ?? createEmptyResultData("Unknown")
        const hasStatus = current.status !== "Unknown"

        if (hasStatus && !isExtractionComplete(current)) {
          evaluateAndLogRuleFailures(current)
        }

        const elapsed = Date.now() - startedAt

        if (hasStatus && isExtractionComplete(current)) {
          console.log("[EXTRACTION EARLY FINISH]", {
            status: current.status,
            runtime: current.runtime,
            memory: current.memory,
            reason: "isExtractionComplete returned true"
          })
          finish(current, "Extraction complete")
          return
        }

        if (elapsed >= RESULT_EXTRACTION_TIMEOUT_MS) {
          if (hasStatus) {
            finish(current, "Timeout")
          } else {
            resultDebugWarn("Timeout with no status", { attempts, best })
            finish(current, "Timeout (no status)")
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
            resultDebugLog("DOM updated", { container: container.tagName })
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
            resultDebugLog("DOM updated", { container: "document.body" })
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
        attachObservers()
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
