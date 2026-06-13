export const STORAGE_KEYS = {
  ACTIVE_SESSION: "leetex_active_session",
  SESSION_HISTORY: "leetex_session_history",
  USER_ID: "leetex_user_id",
  CONSENT_ACCEPTED: "leetex_consent_accepted"
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
