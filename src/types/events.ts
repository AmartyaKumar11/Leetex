import type { ResultMetadata } from "~/types/results"

export const EVENT_TYPES = {
  QUESTION_OPENED: "QUESTION_OPENED",
  FIRST_EDIT: "FIRST_EDIT",
  FIRST_RUN: "FIRST_RUN",
  FIRST_SUBMIT: "FIRST_SUBMIT",
  RUN_CODE: "RUN_CODE",
  SUBMIT: "SUBMIT",
  EDITORIAL_OPENED: "EDITORIAL_OPENED",
  EDITORIAL_CLOSED: "EDITORIAL_CLOSED",
  SOLUTION_OPENED: "SOLUTION_OPENED",
  SOLUTION_CLOSED: "SOLUTION_CLOSED",
  DISCUSSION_OPENED: "DISCUSSION_OPENED",
  DISCUSSION_CLOSED: "DISCUSSION_CLOSED",
  IDLE_STARTED: "IDLE_STARTED",
  IDLE_ENDED: "IDLE_ENDED",
  LANGUAGE_CHANGED: "LANGUAGE_CHANGED",
  MAJOR_REWRITE: "MAJOR_REWRITE",
  RUN_RESULT: "RUN_RESULT",
  SUBMISSION_RESULT: "SUBMISSION_RESULT"
} as const

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]

export interface LanguageChangedMetadata {
  oldLanguage: string
  newLanguage: string
}

export interface IdleEndedMetadata {
  durationSeconds: number
}

export interface MajorRewriteMetadata {
  similarity: number
}

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

export type RunResultMetadata = ResultMetadata
export type SubmissionResultMetadata = ResultMetadata
