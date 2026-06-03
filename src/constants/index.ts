export { EVENT_TYPES } from "~/types/events"
export {
  FIRST_EDIT_MIN_CODE_LENGTH,
  IDLE_TIMEOUT_MS,
  MAJOR_REWRITE_SIMILARITY_THRESHOLD,
  SIGNAL_POLL_INTERVAL_MS
} from "~/constants/signals"
export {
  RESULT_EXTRACTION_TIMEOUT_MS,
  RESULT_RETRY_INTERVAL_MS,
  RESULT_MAX_RETRIES,
  RESULT_DEBUG_STORAGE_KEY
} from "~/constants/result-extraction"
export {
  PERIODIC_SNAPSHOT_INTERVAL_MS,
  OBSERVER_DEBUG_STORAGE_KEY
} from "~/constants/observer"
export const LEETCODE_MATCHES = [
  "https://leetcode.com/problems/*",
  "https://leetcode.com/problems/*/*",
  "https://leetcode.com/problems/*/*/*"
] as const

export const OBSERVER_DEBOUNCE_MS = 300

export const TITLE_POLL_INTERVAL_MS = 1000

export const TITLE_POLL_MAX_ATTEMPTS = 15

export const EDITOR_POLL_INTERVAL_MS = 500

export const EDITOR_POLL_MAX_ATTEMPTS = 20
