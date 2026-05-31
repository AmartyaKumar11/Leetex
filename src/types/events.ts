export const EVENT_TYPES = {
  QUESTION_OPENED: "QUESTION_OPENED",
  RUN_CODE: "RUN_CODE",
  SUBMIT: "SUBMIT",
  EDITORIAL_OPENED: "EDITORIAL_OPENED"
} as const

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]

export interface SessionEvent {
  eventId: string
  type: EventType
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface RegisterEventOptions {
  metadata?: Record<string, unknown>
  skipSnapshot?: boolean
}
