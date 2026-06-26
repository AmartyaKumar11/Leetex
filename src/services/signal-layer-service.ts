import {
  FIRST_EDIT_MIN_CODE_LENGTH,
  SIGNAL_POLL_INTERVAL_MS
} from "~/constants/signals"
import { idleDetectionService } from "~/services/idle-detection-service"
import { resultExtractionService } from "~/services/result-extraction-service"
import { snapshotSchedulerService } from "~/services/snapshot-scheduler-service"
import { sessionManager } from "~/services/session-manager"
import { EVENT_TYPES } from "~/types/events"
import { computeCodeSimilarity } from "~/utils/code-similarity"
import { firstEditDebugLog, hashCode } from "~/utils/code-hash"
import { extractEditorState } from "~/utils/leetcode-dom"
import { observerDebugLog } from "~/utils/observer-debug"

function isBoilerplateCode(code: string): boolean {
  if (!code || code.trim().length === 0) {
    return true
  }

  const lines = code.split("\n")
  const substantiveLines = lines.filter((line) => {
    const trimmed = line.trim()

    if (trimmed.length === 0) {
      return false
    }

    if (/^[{}();]*$/.test(trimmed)) {
      return false
    }

    if (/^(class\s|public:|private:|protected:|def |function |fn |func )/.test(trimmed)) {
      return false
    }

    if (/^(int |void |string |vector|long |bool |char |return\s*;|#)/.test(trimmed)) {
      return false
    }

    return true
  })

  return substantiveLines.length <= 2
}

export class SignalLayerService {
  private pollIntervalId: ReturnType<typeof setInterval> | null = null
  private baselineCode: string | null = null
  private lastKnownLanguage: string | null = null
  private firstEditFired = false

  async onSessionReady(): Promise<void> {
    this.resetSessionState()

    const snapshot = await sessionManager.captureInitialSnapshot()

    if (snapshot) {
      this.baselineCode = snapshot.code
      this.lastKnownLanguage = snapshot.language

      if (!isBoilerplateCode(snapshot.code)) {
        await sessionManager.markAsReturningSession()
        observerDebugLog("Returning session detected — editor had non-boilerplate code at start")
      }

      firstEditDebugLog("Initial Snapshot Hash", {
        hash: hashCode(snapshot.code),
        codeLength: snapshot.code.length,
        language: snapshot.language
      })
    }

    idleDetectionService.start()
    snapshotSchedulerService.start()
    this.startPolling()
  }

  stop(): void {
    this.stopPolling()
    idleDetectionService.stop()
    snapshotSchedulerService.stop()
    this.resetSessionState()
  }

  recordUserActivity(): void {
    idleDetectionService.recordActivity()
  }

  async onRunCode(): Promise<void> {
    this.recordUserActivity()
    await sessionManager.registerEventOnce(EVENT_TYPES.FIRST_RUN, { skipSnapshot: true })
    void resultExtractionService.captureRunResult()
  }

  async onSubmitCode(): Promise<void> {
    this.recordUserActivity()
    await sessionManager.registerEventOnce(EVENT_TYPES.FIRST_SUBMIT, { skipSnapshot: true })
    void resultExtractionService.captureSubmissionResult()
  }

  private startPolling(): void {
    this.stopPolling()

    this.pollIntervalId = setInterval(() => {
      void this.pollSignals()
    }, SIGNAL_POLL_INTERVAL_MS)
  }

  private stopPolling(): void {
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId)
      this.pollIntervalId = null
    }
  }

  private async pollSignals(): Promise<void> {
    if (!sessionManager.getCurrentSession()) {
      return
    }

    const { code, language } = extractEditorState()

    this.checkFirstEdit(code)
    this.checkLanguageChange(language)

    if (code !== this.getLastPolledCode()) {
      this.setLastPolledCode(code)
      idleDetectionService.recordActivity()
    }
  }

  private lastPolledCode: string | null = null

  private getLastPolledCode(): string | null {
    return this.lastPolledCode
  }

  private setLastPolledCode(code: string): void {
    this.lastPolledCode = code
  }

  private async checkFirstEdit(currentCode: string): Promise<void> {
    if (this.firstEditFired || this.baselineCode === null) {
      return
    }

    if (currentCode.length < FIRST_EDIT_MIN_CODE_LENGTH) {
      return
    }

    const similarity = computeCodeSimilarity(this.baselineCode, currentCode)

    firstEditDebugLog("First Edit Check", {
      initialHash: hashCode(this.baselineCode),
      currentHash: hashCode(currentCode),
      similarity,
      currentLength: currentCode.length
    })

    if (similarity >= 0.98) {
      return
    }

    this.firstEditFired = true

    firstEditDebugLog("First Edit Detection Trigger", {
      initialHash: hashCode(this.baselineCode),
      currentHash: hashCode(currentCode),
      similarity
    })

    await sessionManager.registerEvent(EVENT_TYPES.FIRST_EDIT, {
      skipSnapshot: true
    })

    idleDetectionService.recordActivity()
  }

  private async checkLanguageChange(language: string | null): Promise<void> {
    if (!language) {
      return
    }

    if (this.lastKnownLanguage === null) {
      this.lastKnownLanguage = language
      return
    }

    if (language === this.lastKnownLanguage) {
      return
    }

    const oldLanguage = this.lastKnownLanguage
    this.lastKnownLanguage = language

    await sessionManager.registerEvent(EVENT_TYPES.LANGUAGE_CHANGED, {
      metadata: { oldLanguage, newLanguage: language },
      skipSnapshot: true
    })

    idleDetectionService.recordActivity()
  }

  private resetSessionState(): void {
    this.baselineCode = null
    this.lastKnownLanguage = null
    this.firstEditFired = false
    this.lastPolledCode = null
  }
}

export const signalLayerService = new SignalLayerService()
