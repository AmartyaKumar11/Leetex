import { EVENT_TYPES, TITLE_POLL_INTERVAL_MS, TITLE_POLL_MAX_ATTEMPTS } from "~/constants"
import { learningSourceTrackingService } from "~/services/learning-source-tracking-service"
import { signalLayerService } from "~/services/signal-layer-service"
import { sessionManager } from "~/services/session-manager"
import type { LearningSourceView } from "~/types/learning-source"
import {
  detectLearningSourceView,
  extractQuestionSlug,
  fetchProblemMetadata,
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
  private boundPageHide: (() => void) | null = null
  private boundPageShow: ((event: PageTransitionEvent) => void) | null = null
  private boundPopState: (() => void) | null = null

  async start(): Promise<void> {
    if (this.started) {
      return
    }

    this.started = true

    await sessionManager.initialize()

    this.attachClickListener()
    this.attachUrlObserver()
    this.attachTabObserver()
    this.attachPageLifecycleHandlers()

    if (isLeetCodeProblemUrl()) {
      await this.handleProblemPage()
    }
  }

  stop(): void {
    if (!this.started) {
      return
    }

    this.started = false
    signalLayerService.stop()
    this.urlObserver?.disconnect()
    this.urlObserver = null
    this.tabObserver?.disconnect()
    this.tabObserver = null
    document.removeEventListener("click", this.onDocumentClick, true)

    if (this.boundPageHide) {
      window.removeEventListener("pagehide", this.boundPageHide)
      this.boundPageHide = null
    }

    if (this.boundPageShow) {
      window.removeEventListener("pageshow", this.boundPageShow)
      this.boundPageShow = null
    }

    if (this.boundPopState) {
      window.removeEventListener("popstate", this.boundPopState)
      this.boundPopState = null
    }

    void this.finalizeSessionOnLeave()
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

    this.boundPopState = this.onPopState
    window.addEventListener("popstate", this.boundPopState)
  }

  private onPopState = (): void => {
    this.lastUrl = location.href
    void this.handleNavigation()
  }

  private attachPageLifecycleHandlers(): void {
    this.boundPageHide = () => {
      void this.finalizeSessionOnLeave()
    }

    this.boundPageShow = (event: PageTransitionEvent) => {
      this.lastUrl = location.href

      if (event.persisted) {
        void this.handleBfcacheRestore()
        return
      }

      void this.handleNavigation()
    }

    window.addEventListener("pagehide", this.boundPageHide)
    window.addEventListener("pageshow", this.boundPageShow)
  }

  private async finalizeSessionOnLeave(): Promise<void> {
    if (!sessionManager.getCurrentSession()) {
      this.currentSlug = null
      this.lastSyncedView = null
      return
    }

    signalLayerService.stop()
    this.currentSlug = null
    this.lastSyncedView = null
    learningSourceTrackingService.reset()
    await sessionManager.endSession()
  }

  private async handleBfcacheRestore(): Promise<void> {
    signalLayerService.stop()
    this.lastSyncedView = null
    learningSourceTrackingService.reset()
    this.currentSlug = null

    if (sessionManager.getCurrentSession()) {
      await sessionManager.endSession()
    }

    if (isLeetCodeProblemUrl()) {
      await this.handleProblemPage()
    }
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
      if (this.currentSlug || sessionManager.getCurrentSession()) {
        await this.finalizeSessionOnLeave()
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
      const [metadata, problemMetadata] = await Promise.all([
        waitForQuestionMetadata(TITLE_POLL_MAX_ATTEMPTS, TITLE_POLL_INTERVAL_MS),
        fetchProblemMetadata(slug).catch(() => null)
      ])

      this.currentSlug = metadata.slug

      await sessionManager.createSession({
        questionTitle: metadata.title,
        questionSlug: metadata.slug,
        difficulty: metadata.difficulty,
        topicTags: problemMetadata?.topicTags ?? [],
        leetcodeId: problemMetadata?.questionId ?? null
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
