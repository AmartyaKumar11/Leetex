import { EVENT_TYPES, TITLE_POLL_INTERVAL_MS, TITLE_POLL_MAX_ATTEMPTS } from "~/constants"
import { learningSourceTrackingService } from "~/services/learning-source-tracking-service"
import { signalLayerService } from "~/services/signal-layer-service"
import { sessionManager } from "~/services/session-manager"
import type { LearningSourceView } from "~/types/learning-source"
import {
  detectLearningSourceView,
  extractQuestionSlug,
  isLearningSourceTab,
  isLeetCodeProblemUrl,
  isRunCodeButton,
  isSubmitButton,
  waitForQuestionMetadata
} from "~/utils/leetcode-dom"

export class LeetCodeSessionObserver {
  private started = false
  private currentSlug: string | null = null
  private lastUrl = location.href
  private lastSyncedView: LearningSourceView | null = null
  private urlObserver: MutationObserver | null = null
  private tabObserver: MutationObserver | null = null

  async start(): Promise<void> {
    if (this.started) {
      return
    }

    this.started = true

    await sessionManager.initialize()

    this.attachClickListener()
    this.attachUrlObserver()
    this.attachTabObserver()

    if (isLeetCodeProblemUrl()) {
      await this.handleProblemPage()
    }
  }

  stop(): void {
    this.started = false
    signalLayerService.stop()
    this.urlObserver?.disconnect()
    this.urlObserver = null
    this.tabObserver?.disconnect()
    this.tabObserver = null
    document.removeEventListener("click", this.onDocumentClick, true)
  }

  private attachClickListener(): void {
    document.addEventListener("click", this.onDocumentClick, true)
  }

  private attachUrlObserver(): void {
    this.urlObserver = new MutationObserver(() => {
      if (location.href === this.lastUrl) {
        return
      }

      this.lastUrl = location.href
      void this.handleNavigation()
    })

    this.urlObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    })

    window.addEventListener("popstate", () => {
      void this.handleNavigation()
    })
  }

  private attachTabObserver(): void {
    this.tabObserver = new MutationObserver(() => {
      void this.syncLearningSourceView("navigation")
    })

    this.tabObserver.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-selected", "data-state"]
    })
  }

  private onDocumentClick = (event: MouseEvent): void => {
    const target = event.target

    if (!(target instanceof Element)) {
      return
    }

    signalLayerService.recordUserActivity()

    if (isRunCodeButton(target)) {
      void this.handleRunCode()
      return
    }

    if (isSubmitButton(target)) {
      void this.handleSubmitCode()
      return
    }

    const tabElement = target.closest("a, button, [role='tab']")
    const learningView = isLearningSourceTab(tabElement)

    if (learningView) {
      void this.syncLearningSourceView("click", learningView)
    }
  }

  private async handleRunCode(): Promise<void> {
    await sessionManager.registerEvent(EVENT_TYPES.RUN_CODE, {
      metadata: { source: "click" }
    })
    await signalLayerService.onRunCode()
  }

  private async handleSubmitCode(): Promise<void> {
    await sessionManager.registerEvent(EVENT_TYPES.SUBMIT, {
      metadata: { source: "click" }
    })
    await signalLayerService.onSubmitCode()
  }

  private async handleNavigation(): Promise<void> {
    if (!isLeetCodeProblemUrl()) {
      if (this.currentSlug) {
        signalLayerService.stop()
        await sessionManager.endSession()
        this.currentSlug = null
        this.lastSyncedView = null
        learningSourceTrackingService.reset()
      }

      return
    }

    const slug = extractQuestionSlug()

    if (!slug) {
      return
    }

    if (slug !== this.currentSlug) {
      signalLayerService.stop()
      this.lastSyncedView = null
      await this.handleProblemPage()
      return
    }

    signalLayerService.recordUserActivity()
    await this.syncLearningSourceView("navigation")
  }

  private async handleProblemPage(): Promise<void> {
    const slug = extractQuestionSlug()

    if (!slug) {
      return
    }

    try {
      const metadata = await waitForQuestionMetadata(
        TITLE_POLL_MAX_ATTEMPTS,
        TITLE_POLL_INTERVAL_MS
      )

      this.currentSlug = metadata.slug

      await sessionManager.createSession({
        questionTitle: metadata.title,
        questionSlug: metadata.slug,
        difficulty: metadata.difficulty
      })

      await signalLayerService.onSessionReady()
      await this.syncLearningSourceView("navigation")
    } catch (error) {
      console.warn("[LeetEx] Failed to initialize session:", error)
    }
  }

  private async syncLearningSourceView(
    trigger: "navigation" | "click",
    explicitView?: LearningSourceView
  ): Promise<void> {
    if (!sessionManager.getCurrentSession()) {
      return
    }

    const view = explicitView ?? detectLearningSourceView()

    if (!view) {
      return
    }

    const activeSource = learningSourceTrackingService.getActiveSource()

    if (view !== "editor" && activeSource === view) {
      this.lastSyncedView = view
      return
    }

    if (view === this.lastSyncedView && trigger === "navigation") {
      return
    }

    this.lastSyncedView = view
    await learningSourceTrackingService.syncView(view, trigger)
  }
}

export const leetcodeSessionObserver = new LeetCodeSessionObserver()
