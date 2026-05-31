import type { Session, SessionJSON } from "~/types/session"

export function serializeSession(session: Session): SessionJSON {
  return structuredClone(session)
}

export function serializeSessionToJson(
  session: Session,
  pretty = true
): string {
  const payload = serializeSession(session)
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
