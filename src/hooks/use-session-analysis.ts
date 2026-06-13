import { useMemo } from "react"

import { behavioralSignalEngine } from "~/services/behavioral-signal-engine"
import type { SessionAnalysis } from "~/types/session-analysis"
import type { Session } from "~/types/session"

export function useSessionAnalysis(session: Session | null): SessionAnalysis | null {
  return useMemo(() => {
    if (!session) {
      return null
    }

    return behavioralSignalEngine.analyze(session)
  }, [session])
}
