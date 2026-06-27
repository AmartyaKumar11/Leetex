import { AUTH_MESSAGE } from "~/constants/auth-messages"
import { exportService } from "~/services/export-service"
import type { SessionExportPayload } from "~/types/export"
import type { Session } from "~/types/session"
import { observerDebugLog } from "~/utils/observer-debug"

const BACKEND_URL = process.env.PLASMO_PUBLIC_BACKEND_URL

interface SyncSessionResponse {
  ok?: boolean
  status?: number
}

export class SyncService {
  async syncSession(session: Session): Promise<boolean> {
    try {
      if (!BACKEND_URL) {
        observerDebugLog("Sync skipped — no backend URL configured")
        return false
      }

      const payload = await exportService.buildExportPayload(session)

      if (!payload) {
        observerDebugLog("Sync skipped — export payload unavailable", {
          sessionId: session.sessionId
        })
        return false
      }

      const response = await this.postViaBackground(payload)

      if (response.ok) {
        observerDebugLog("Sync succeeded", { sessionId: session.sessionId })
        return true
      }

      observerDebugLog("Sync failed", {
        sessionId: session.sessionId,
        status: response.status
      })
      return false
    } catch (error) {
      observerDebugLog("Sync error", {
        sessionId: session.sessionId,
        message: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  private postViaBackground(payload: SessionExportPayload): Promise<SyncSessionResponse> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: AUTH_MESSAGE.SYNC_SESSION, payload },
        (response: SyncSessionResponse) => {
          if (chrome.runtime.lastError) {
            observerDebugLog("Sync error", { message: chrome.runtime.lastError.message })
            resolve({ ok: false })
            return
          }

          resolve(response ?? { ok: false })
        }
      )
    })
  }
}

export const syncService = new SyncService()
