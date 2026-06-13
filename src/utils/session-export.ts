import type { Session } from "~/types/session"
import type { SessionExportPayload } from "~/types/export"

export function serializeSession(session: Session): Session {
  return structuredClone(session)
}

export function serializeExportPayload(payload: SessionExportPayload): SessionExportPayload {
  return structuredClone(payload)
}

export function serializeExportToJson(
  payload: SessionExportPayload,
  pretty = true
): string {
  return JSON.stringify(payload, null, pretty ? 2 : undefined)
}

export function downloadJsonFile(filename: string, json: string): void {
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = filename
  anchor.click()

  URL.revokeObjectURL(url)
}

export function buildSessionFilename(session: Session): string {
  return `leetex-session-${session.questionSlug}-${session.sessionId}.json`
}
