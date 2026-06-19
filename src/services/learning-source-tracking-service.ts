import { EVENT_TYPES, type EventType } from "~/types/events"
import { sessionManager } from "~/services/session-manager"
import type { LearningSourceId, LearningSourceView } from "~/types/learning-source"
import { now } from "~/utils/time"

type LearningSourceTrigger = "navigation" | "click" | "session_end"

const OPEN_EVENT_BY_SOURCE: Record<LearningSourceId, EventType> = {
  editorial: EVENT_TYPES.EDITORIAL_OPENED,
  solutions: EVENT_TYPES.SOLUTION_OPENED,
  discussion: EVENT_TYPES.DISCUSSION_OPENED
}

const CLOSE_EVENT_BY_SOURCE: Record<LearningSourceId, EventType> = {
  editorial: EVENT_TYPES.EDITORIAL_CLOSED,
  solutions: EVENT_TYPES.SOLUTION_CLOSED,
  discussion: EVENT_TYPES.DISCUSSION_CLOSED
}

export class LearningSourceTrackingService {
  private active: { source: LearningSourceId; openedAt: number } | null = null

  reset(): void {
    this.active = null
  }

  getActiveSource(): LearningSourceId | null {
    return this.active?.source ?? null
  }

  async syncView(view: LearningSourceView | null, trigger: LearningSourceTrigger): Promise<void> {
    if (!view || !sessionManager.getCurrentSession()) {
      return
    }

    if (view === "editor") {
      await this.closeActive(trigger)
      return
    }

    if (this.active?.source === view) {
      return
    }

    await this.closeActive(trigger)
    await this.openSource(view, trigger)
  }

  async closeOnSessionEnd(): Promise<void> {
    await this.closeActive("session_end")
    this.reset()
  }

  private async openSource(source: LearningSourceId, trigger: LearningSourceTrigger): Promise<void> {
    const openedAt = now()

    await sessionManager.registerEvent(OPEN_EVENT_BY_SOURCE[source], {
      metadata: { trigger, url: location.href },
      skipSnapshot: true
    })

    this.active = { source, openedAt }
  }

  private async closeActive(trigger: LearningSourceTrigger): Promise<void> {
    if (!this.active) {
      return
    }

    const durationMs = Math.max(0, now() - this.active.openedAt)
    const { source } = this.active

    this.active = null

    await sessionManager.registerEvent(CLOSE_EVENT_BY_SOURCE[source], {
      metadata: { durationMs, trigger },
      skipSnapshot: true
    })
  }
}

export const learningSourceTrackingService = new LearningSourceTrackingService()
