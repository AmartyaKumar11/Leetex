import { STORAGE_KEYS } from "~/constants/storage-keys"
import type { Session } from "~/types/session"

export class StorageService {
  static async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get(key)
    const value = result[key]

    if (value === undefined) {
      return null
    }

    return value as T
  }

  static async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value })
  }

  static async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(key)
  }

  static async getActiveSession(): Promise<Session | null> {
    return this.get<Session>(STORAGE_KEYS.ACTIVE_SESSION)
  }

  static async saveActiveSession(session: Session): Promise<void> {
    await this.set(STORAGE_KEYS.ACTIVE_SESSION, session)
  }

  static async clearActiveSession(): Promise<void> {
    await this.remove(STORAGE_KEYS.ACTIVE_SESSION)
  }

  static async getSessionHistory(): Promise<Session[]> {
    return (await this.get<Session[]>(STORAGE_KEYS.SESSION_HISTORY)) ?? []
  }

  static async appendToHistory(session: Session): Promise<void> {
    const history = await this.getSessionHistory()
    const withoutDuplicate = history.filter((item) => item.sessionId !== session.sessionId)

    await this.set(STORAGE_KEYS.SESSION_HISTORY, [...withoutDuplicate, session])
  }

  static onChanged(
    callback: (changes: Record<string, chrome.storage.StorageChange>) => void
  ): () => void {
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== "local") {
        return
      }

      callback(changes)
    }

    chrome.storage.onChanged.addListener(listener)

    return () => {
      chrome.storage.onChanged.removeListener(listener)
    }
  }
}
