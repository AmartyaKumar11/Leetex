import { useEffect, useState } from "react"

import { sessionManager } from "~/services/session-manager"
import type { Session } from "~/types/session"

export function useSessionState(): Session | null {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    void sessionManager.initialize()

    return sessionManager.subscribe(setSession)
  }, [])

  return session
}
