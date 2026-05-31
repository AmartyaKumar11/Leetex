export const STORAGE_KEYS = {
  ACTIVE_SESSION: "leetex_active_session",
  SESSION_HISTORY: "leetex_session_history"
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
