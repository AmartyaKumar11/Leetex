import { EVENT_TYPES, TITLE_POLL_INTERVAL_MS, TITLE_POLL_MAX_ATTEMPTS } from "~/constants"
import { sessionManager } from "~/services/session-manager"
import {
  extractQuestionSlug,
  isEditorialTrigger,
  isEditorialUrl,
  isLeetCodeProblemUrl,
  isRunCodeButton,
  isSubmitButton,
  waitForQuestionMetadata
} from "~/utils/leetcode-dom"

export class LeetCodeSessionObserver {
  private started = false
  private currentSlug: string | null = null
  private lastUrl = location.href
  private urlObserver: MutationObserver | null = null
  private editorialTracked = false

  async start(): Promise<void> {
    if (this.started) {
      return
    }

    this.started = true

    await sessionManager.initialize()

    this.attachClickListener()
    this.attachUrlObserver()

    if (isLeetCodeProblemUrl()) {
      await this.handleProblemPage()
    }
  }

  stop(): void {
    this.started = false
    this.urlObserver?.disconnect()
    this.urlObserver = null
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

  private onDocumentClick = (event: MouseEvent): void => {
    const target = event.target

    if (!(target instanceof Element)) {
      return
    }

    if (isRunCodeButton(target)) {
      void sessionManager.registerEvent(EVENT_TYPES.RUN_CODE, {
        metadata: { source: "click" }
      })
      return
    }

    if (isSubmitButton(target)) {
      void sessionManager.registerEvent(EVENT_TYPES.SUBMIT, {
        metadata: { source: "click" }
      })
      return
    }

    const editorialElement = target.closest("a, button, [role='tab']")

    if (isEditorialTrigger(editorialElement)) {
      void this.trackEditorialOpened("click")
    }
  }

  private async handleNavigation(): Promise<void> {
    if (!isLeetCodeProblemUrl()) {
      if (this.currentSlug) {
        await sessionManager.endSession()
        this.currentSlug = null
        this.editorialTracked = false
      }

      return
    }

    if (isEditorialUrl()) {
      await this.trackEditorialOpened("navigation")
      return
    }

    const slug = extractQuestionSlug()

    if (!slug) {
      return
    }

    if (slug !== this.currentSlug) {
      this.editorialTracked = false
      await this.handleProblemPage()
    }
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
    } catch (error) {
      console.warn("[LeetEx] Failed to initialize session:", error)
    }
  }

  private async trackEditorialOpened(source: "click" | "navigation"): Promise<void> {
    if (this.editorialTracked) {
      return
    }

    const session = sessionManager.getCurrentSession()

    if (!session) {
      return
    }

    this.editorialTracked = true

    await sessionManager.registerEvent(EVENT_TYPES.EDITORIAL_OPENED, {
      metadata: { source, url: location.href }
    })
  }
}

export const leetcodeSessionObserver = new LeetCodeSessionObserver()
