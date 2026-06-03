import { PERIODIC_SNAPSHOT_INTERVAL_MS } from "~/constants/observer"
import { sessionManager } from "~/services/session-manager"
import { snapshotHashService } from "~/services/snapshot-hash-service"
import { extractEditorState } from "~/utils/leetcode-dom"
import { observerDebugLog } from "~/utils/observer-debug"

export class SnapshotSchedulerService {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastSnapshotHash: string | null = null

  start(): void {
    this.stop()
    this.syncLastHashFromSession()

    observerDebugLog("Snapshot Scheduler Started", {
      intervalMs: PERIODIC_SNAPSHOT_INTERVAL_MS
    })

    this.intervalId = setInterval(() => {
      void this.tick()
    }, PERIODIC_SNAPSHOT_INTERVAL_MS)
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
      observerDebugLog("Snapshot Scheduler Stopped")
    }

    this.lastSnapshotHash = null
  }

  private async tick(): Promise<void> {
    const session = sessionManager.getCurrentSession()

    if (!session || session.status !== "active") {
      return
    }

    const { code, language } = extractEditorState()

    if (!code.trim()) {
      return
    }

    const hash = await snapshotHashService.hashCode(code)

    if (hash === this.lastSnapshotHash) {
      observerDebugLog("Periodic Snapshot Skipped (unchanged)", { hash })
      return
    }

    const snapshot = await sessionManager.registerSnapshot({
      trigger: "PERIODIC",
      code,
      language
    })

    if (snapshot) {
      this.lastSnapshotHash = snapshot.snapshotHash
      observerDebugLog("Periodic Snapshot Created", {
        snapshotId: snapshot.snapshotId,
        hash: snapshot.snapshotHash,
        similarityToPrevious: snapshot.similarityToPrevious
      })
    }
  }

  private syncLastHashFromSession(): void {
    const session = sessionManager.getCurrentSession()
    const last = session?.snapshots.at(-1)
    this.lastSnapshotHash = last?.snapshotHash ?? null
  }
}

export const snapshotSchedulerService = new SnapshotSchedulerService()
