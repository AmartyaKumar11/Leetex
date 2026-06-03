export { EVENT_TYPES } from "~/types/events"
export {
  FIRST_EDIT_MIN_CODE_LENGTH,
  IDLE_TIMEOUT_MS,
  MAJOR_REWRITE_SIMILARITY_THRESHOLD,
  RESULT_POLL_INTERVAL_MS,
  RESULT_POLL_MAX_ATTEMPTS,
  SIGNAL_POLL_INTERVAL_MS
} from "~/constants/signals"

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
