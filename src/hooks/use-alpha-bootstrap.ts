import { useCallback, useEffect, useState } from "react"

import { consentService } from "~/services/consent-service"
import { AUTH_MESSAGE } from "~/constants/auth-messages"
import { getAuthState } from "~/services/auth-bridge-service"
import { userIdentityService } from "~/services/user-identity-service"
import { versionService } from "~/services/version-service"

export interface AlphaBootstrapState {
  loading: boolean
  consentAccepted: boolean
  userId: string | null
  isAuthenticated: boolean
  email: string | null
  version: string
  refreshAuth: () => Promise<void>
}

export function useAlphaBootstrap(): AlphaBootstrapState {
  const [state, setState] = useState<Omit<AlphaBootstrapState, "refreshAuth">>({
    loading: true,
    consentAccepted: false,
    userId: null,
    isAuthenticated: false,
    email: null,
    version: versionService.currentVersion
  })

  const refreshAuth = useCallback(async () => {
    const [localUserId, consentAccepted, auth] = await Promise.all([
      userIdentityService.initialize(),
      consentService.hasAcceptedConsent(),
      getAuthState()
    ])

    setState({
      loading: false,
      consentAccepted,
      isAuthenticated: auth.isSignedIn,
      email: auth.email,
      userId: auth.isSignedIn && auth.userId ? auth.userId : localUserId,
      version: versionService.currentVersion
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      await refreshAuth()

      if (cancelled) {
        return
      }
    })()

    const interval = window.setInterval(() => {
      void refreshAuth()
    }, 3000)

    const onFocus = () => {
      void refreshAuth()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshAuth()
      }
    }

    const onAuthChanged = (message: { type?: string }) => {
      if (message?.type === AUTH_MESSAGE.AUTH_CHANGED) {
        void refreshAuth()
      }
    }

    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibilityChange)
    chrome.runtime.onMessage.addListener(onAuthChanged)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      chrome.runtime.onMessage.removeListener(onAuthChanged)
    }
  }, [refreshAuth])

  return {
    ...state,
    refreshAuth
  }
}

export async function acceptConsent(): Promise<void> {
  await consentService.acceptConsent()
}
