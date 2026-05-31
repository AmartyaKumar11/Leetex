import { useSessionState } from "~/hooks/use-session-state"
import { sessionManager } from "~/services/session-manager"
import type { Difficulty } from "~/types/session"
import { buildSessionFilename, downloadJsonFile } from "~/utils/session-export"

function difficultyClass(difficulty: Difficulty | null): string {
  if (!difficulty) {
    return "leetex-difficulty leetex-difficulty-unknown"
  }

  return `leetex-difficulty leetex-difficulty-${difficulty.toLowerCase()}`
}

export function LeetCodeSidebar() {
  const session = useSessionState()
  const eventCount = session?.events.length ?? 0

  const handleExport = () => {
    const json = sessionManager.exportSessionAsJson()

    if (!json || !session) {
      return
    }

    downloadJsonFile(buildSessionFilename(session), json)
  }

  return (
    <aside className="leetex-sidebar">
      <header className="leetex-header">
        <div className="leetex-brand">
          <span className="leetex-status-dot" aria-hidden="true" />
          <span className="leetex-brand-title">LeetEx Active</span>
        </div>
        <p className="leetex-brand-subtitle">The Observer · v0.1</p>
      </header>

      <div className="leetex-body">
        <section className="leetex-card">
          <p className="leetex-card-label">Current Question</p>
          {session ? (
            <>
              <p className="leetex-question-title">{session.questionTitle}</p>
              <div className="leetex-meta-row">
                <span className={difficultyClass(session.difficulty)}>
                  {session.difficulty ?? "Unknown"}
                </span>
              </div>
            </>
          ) : (
            <p className="leetex-idle">Waiting for a LeetCode problem page…</p>
          )}
        </section>

        <section className="leetex-card">
          <p className="leetex-card-label">Events Captured</p>
          <p className="leetex-stat-value">{eventCount}</p>
          <p className="leetex-stat-caption">
            {session
              ? `${session.snapshots.length} snapshot${session.snapshots.length === 1 ? "" : "s"} stored`
              : "No active session"}
          </p>
        </section>
      </div>

      <footer className="leetex-footer">
        <button
          type="button"
          className="leetex-export-btn"
          disabled={!session}
          onClick={handleExport}>
          Export Session JSON
        </button>
        <p className="leetex-version">leetex.com · observer mode</p>
      </footer>
    </aside>
  )
}
