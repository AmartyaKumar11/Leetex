import {
  FIRST_EDIT_MIN_CODE_LENGTH,
  SIGNAL_POLL_INTERVAL_MS
} from "~/constants/signals"
import { idleDetectionService } from "~/services/idle-detection-service"
import { resultExtractionService } from "~/services/result-extraction-service"
import { sessionManager } from "~/services/session-manager"
import { EVENT_TYPES } from "~/types/events"
import { computeCodeSimilarity } from "~/utils/code-similarity"
import { extractEditorState } from "~/utils/leetcode-dom"

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
    }

    idleDetectionService.start()
    this.startPolling()
  }

  stop(): void {
    this.stopPolling()
    idleDetectionService.stop()
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

    if (similarity >= 0.98) {
      return
    }

    this.firstEditFired = true

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
