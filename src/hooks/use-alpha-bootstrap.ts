import { useEffect, useState } from "react"

import { consentService } from "~/services/consent-service"
import { userIdentityService } from "~/services/user-identity-service"
import { versionService } from "~/services/version-service"

export interface AlphaBootstrapState {
  loading: boolean
  consentAccepted: boolean
  userId: string | null
  version: string
}

export function useAlphaBootstrap(): AlphaBootstrapState {
  const [state, setState] = useState<AlphaBootstrapState>({
    loading: true,
    consentAccepted: false,
    userId: null,
    version: versionService.currentVersion
  })

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const [userId, consentAccepted] = await Promise.all([
        userIdentityService.initialize(),
        consentService.hasAcceptedConsent()
      ])

      if (cancelled) {
        return
      }

      setState({
        loading: false,
        consentAccepted,
        userId,
        version: versionService.currentVersion
      })
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return state
}

export async function acceptConsent(): Promise<void> {
  await consentService.acceptConsent()
}
