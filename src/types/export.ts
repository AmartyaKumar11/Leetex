import type { SessionAnalysis } from "~/types/session-analysis-export"
import type { Session } from "~/types/session"

export interface ExportMetadata {
  userId: string
  leetexVersion: string
  exportedAt: string
  browser: string
  platform: "leetcode"
}

export interface SessionExportPayload {
  metadata: ExportMetadata
  session: Session
  analysis: SessionAnalysis | null
}

export type ExportValidationError =
  | "missing_user_id"
  | "missing_version"
  | "missing_session"

export interface ExportResult {
  success: true
  payload: SessionExportPayload
  json: string
}

export interface ExportFailure {
  success: false
  error: ExportValidationError
  message: string
}

export type ExportOutcome = ExportResult | ExportFailure
