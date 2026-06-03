import { IDLE_TIMEOUT_MS, SIGNAL_POLL_INTERVAL_MS } from "~/constants/signals"
import { sessionManager } from "~/services/session-manager"
import { EVENT_TYPES } from "~/types/events"
import { now } from "~/utils/time"

export class IdleDetectionService {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastActivityAt = now()
  private idleStartedAt: number | null = null
  private isIdle = false

  start(): void {
    this.stop()
    this.lastActivityAt = now()
    this.idleStartedAt = null
    this.isIdle = false

    this.intervalId = setInterval(() => this.tick(), SIGNAL_POLL_INTERVAL_MS)
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    if (this.isIdle) {
      void this.endIdlePeriod()
    }

    this.isIdle = false
    this.idleStartedAt = null
  }

  recordActivity(): void {
    this.lastActivityAt = now()

    if (this.isIdle) {
      void this.endIdlePeriod()
    }
  }

  private tick(): void {
    if (!sessionManager.getCurrentSession()) {
      return
    }

    const elapsed = now() - this.lastActivityAt

    if (!this.isIdle && elapsed >= IDLE_TIMEOUT_MS) {
      void this.startIdlePeriod()
    }
  }

  private async startIdlePeriod(): Promise<void> {
    if (this.isIdle) {
      return
    }

    this.isIdle = true
    this.idleStartedAt = now()

    await sessionManager.registerEvent(EVENT_TYPES.IDLE_STARTED, {
      skipSnapshot: true
    })
  }

  private async endIdlePeriod(): Promise<void> {
    if (!this.isIdle || this.idleStartedAt === null) {
      this.isIdle = false
      this.idleStartedAt = null
      return
    }

    const durationSeconds = Math.max(
      1,
      Math.floor((now() - this.idleStartedAt) / 1000)
    )

    this.isIdle = false
    this.idleStartedAt = null

    await sessionManager.registerEvent(EVENT_TYPES.IDLE_ENDED, {
      metadata: { durationSeconds },
      skipSnapshot: true
    })
  }
}

export const idleDetectionService = new IdleDetectionService()
