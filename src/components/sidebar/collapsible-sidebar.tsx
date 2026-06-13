import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { ConsentModal } from "~/components/sidebar/consent-modal"
import { CurrentQuestionCard } from "~/components/sidebar/current-question-card"
import { ExportSessionButton } from "~/components/sidebar/export-session-button"
import { LearningInsightsCard } from "~/components/sidebar/learning-insights-card"
import { SessionOverviewCard } from "~/components/sidebar/session-overview-card"
import { StatusIndicator } from "~/components/sidebar/status-indicator"
import { TimelineCard } from "~/components/sidebar/timeline-card"
import { acceptConsent, useAlphaBootstrap } from "~/hooks/use-alpha-bootstrap"
import { useSessionAnalysis } from "~/hooks/use-session-analysis"
import { useSessionState } from "~/hooks/use-session-state"
import { useToast } from "~/hooks/use-toast"
import { cn } from "~/lib/utils"
import { exportService } from "~/services/export-service"
import { buildSessionFilename, downloadJsonFile } from "~/utils/session-export"
import { formatTimelineForDisplay } from "~/utils/timeline-display"
import { now } from "~/utils/time"

import { AboutLeetExCard } from "~/components/sidebar/about-leetex-card"

const COLLAPSED_STORAGE_KEY = "leetex-sidebar-collapsed"
const SIDEBAR_WIDTH = 340

const springTransition = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
  mass: 0.8
}

function readCollapsedPreference(): boolean {
  try {
    const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY)
    return stored === null ? true : stored === "true"
  } catch {
    return true
  }
}

function LeetExMark({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "text-sm font-semibold tracking-tight",
        active ? "text-primary" : "text-foreground"
      )}>
      LX
    </span>
  )
}

export function CollapsibleSidebar() {
  const session = useSessionState()
  const analysis = useSessionAnalysis(session)
  const alpha = useAlphaBootstrap()
  const { toast, showToast } = useToast()
  const [collapsed, setCollapsed] = useState(readCollapsedPreference)
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [, setTick] = useState(0)

  const isActive = session?.status === "active"
  const showConsent = !alpha.loading && !alpha.consentAccepted && !consentAccepted

  useEffect(() => {
    if (!session || session.endTime) {
      return
    }

    const interval = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(interval)
  }, [session])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev

      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next))
      } catch {
        // ignore
      }

      return next
    })
  }, [])

  const handleAcceptConsent = async () => {
    await acceptConsent()
    setConsentAccepted(true)
  }

  const handleExport = async () => {
    const outcome = await exportService.exportSession(session)

    if (!outcome.success) {
      showToast(outcome.message)
      return
    }

    downloadJsonFile(buildSessionFilename(outcome.payload.session), outcome.json)
    showToast("Session exported successfully")
  }

  const elapsedSeconds = session
    ? Math.max(
        0,
        Math.floor(((session.endTime ?? now()) - session.startTime) / 1000)
      )
    : 0

  const runs = analysis?.metrics.totalRuns ?? session?.metrics.totalRuns ?? 0
  const submits = analysis?.metrics.totalSubmissions ?? session?.metrics.totalSubmissions ?? 0
  const timeline = session ? formatTimelineForDisplay(session) : []
  const insights = analysis?.behavioralSignals ?? []

  return (
    <div className="leetex-root dark">
      {showConsent ? <ConsentModal onAccept={handleAcceptConsent} /> : null}

      <AnimatePresence mode="wait" initial={false}>
        {collapsed ? (
          <motion.button
            key="pill"
            type="button"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={springTransition}
            onClick={toggleCollapsed}
            aria-label="Open LeetEx"
            aria-expanded={false}
            className={cn(
              "fixed left-0 top-1/2 z-[2147483647] flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-r-full border border-l-0 border-border bg-sidebar shadow-leetex-lg backdrop-blur-md transition-shadow hover:bg-sidebar/90 active:scale-[0.98]",
              isActive && "border-primary/40 ring-2 ring-primary/25"
            )}>
            <LeetExMark active={isActive} />
          </motion.button>
        ) : (
          <motion.aside
            key="panel"
            initial={{ x: -SIDEBAR_WIDTH, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -SIDEBAR_WIDTH, opacity: 0 }}
            transition={springTransition}
            aria-label="LeetEx learning companion"
            style={{ width: SIDEBAR_WIDTH }}
            className="leetex-sidebar-expanded fixed inset-y-0 left-0 z-[2147483647] flex h-dvh flex-col border-r border-border bg-sidebar text-sidebar-foreground shadow-leetex-lg">
            <header className="shrink-0 border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <span className="text-base font-semibold tracking-tight text-foreground">
                    LeetEx
                  </span>
                  <StatusIndicator active={Boolean(isActive)} />
                  <p className="text-xs text-muted-foreground">
                    {isActive ? "Current session running" : "Ready when you are"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  aria-label="Collapse LeetEx panel"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.98]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="leetex-scroll min-h-0 flex-1 px-4 py-4">
              <div className="space-y-3 pb-2">
                <CurrentQuestionCard
                  title={session?.questionTitle ?? null}
                  difficulty={session?.difficulty ?? null}
                />
                <SessionOverviewCard
                  elapsedSeconds={elapsedSeconds}
                  runs={runs}
                  submits={submits}
                />
                <LearningInsightsCard insights={insights} />
                <TimelineCard entries={timeline} />
                <AboutLeetExCard
                  userId={alpha.userId}
                  version={alpha.version}
                  extensionActive={Boolean(isActive)}
                />
              </div>
            </div>

            <footer className="shrink-0 border-t border-border bg-sidebar px-4 py-4">
              <ExportSessionButton disabled={!session} onExport={handleExport} />
            </footer>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast.visible ? (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            role="status"
            className="fixed bottom-6 left-4 z-[2147483647] rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground shadow-leetex-md">
            {toast.message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
