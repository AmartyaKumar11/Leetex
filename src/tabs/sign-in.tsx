import {
  AuthenticateWithRedirectCallback,
  Show,
  SignIn,
  SignUp,
  useAuth
} from "@clerk/chrome-extension"
import { useEffect, useMemo, useState } from "react"

import { AUTH_MESSAGE } from "~/constants/auth-messages"
import { CLERK_EXTENSION_APPEARANCE } from "~/constants/clerk-appearance"
import { getSignInTabBaseUrl, getSignInTabUrl } from "~/constants/clerk"
import { ClerkLeetExProvider } from "~/providers/clerk-leetex-provider"

import "~/style.css"

type AuthRoute = "sign-in" | "sign-up" | "sso-callback"

function parseAuthRoute(hash: string): AuthRoute {
  if (hash.includes("sso-callback")) {
    return "sso-callback"
  }

  if (hash.includes("sign-up")) {
    return "sign-up"
  }

  return "sign-in"
}

function SignInTabContent() {
  const [hash, setHash] = useState(() => window.location.hash)
  const { isLoaded, isSignedIn } = useAuth()
  const signInUrl = useMemo(() => getSignInTabUrl("#/sign-in"), [])
  const signUpUrl = useMemo(() => getSignInTabUrl("#/sign-up"), [])
  const redirectUrl = useMemo(() => getSignInTabBaseUrl(), [])

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  useEffect(() => {
    if (!isSignedIn) {
      return
    }

    chrome.runtime.sendMessage({ type: AUTH_MESSAGE.AUTH_CHANGED }, () => {
      void chrome.runtime.lastError
    })
  }, [isSignedIn])

  const route = useMemo(() => parseAuthRoute(hash), [hash])

  if (!isLoaded) {
    return (
      <div className="leetex-root dark flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">Loading sign in...</p>
      </div>
    )
  }

  if (route === "sso-callback") {
    return (
      <div className="leetex-root dark flex min-h-screen items-center justify-center bg-background p-6">
        <AuthenticateWithRedirectCallback />
      </div>
    )
  }

  return (
    <div className="leetex-root dark flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
      <Show when="signed-in">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-lg font-semibold text-foreground">You&apos;re signed in</h1>
          <p className="text-sm text-muted-foreground">
            Close this tab and return to LeetCode. The LeetEx sidebar will update within a few
            seconds.
          </p>
        </div>
      </Show>

      <Show when="signed-out">
        <div className="max-w-md space-y-2 text-center">
          <h1 className="text-lg font-semibold text-foreground">
            {route === "sign-up" ? "Create your LeetEx account" : "Sign in to LeetEx"}
          </h1>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Keep this tab open while you check your email for an OTP code. Use email + password or
            OTP only.
          </p>
        </div>

        {route === "sign-up" ? (
          <SignUp
            routing="hash"
            signInUrl={signInUrl}
            signUpUrl={signUpUrl}
            appearance={CLERK_EXTENSION_APPEARANCE}
            forceRedirectUrl={redirectUrl}
            fallbackRedirectUrl={redirectUrl}
          />
        ) : (
          <SignIn
            routing="hash"
            signInUrl={signInUrl}
            signUpUrl={signUpUrl}
            appearance={CLERK_EXTENSION_APPEARANCE}
            forceRedirectUrl={redirectUrl}
            fallbackRedirectUrl={redirectUrl}
          />
        )}
      </Show>
    </div>
  )
}

function SignInTab() {
  return (
    <ClerkLeetExProvider redirectPath="tabs/sign-in.html" appearance={CLERK_EXTENSION_APPEARANCE}>
      <SignInTabContent />
    </ClerkLeetExProvider>
  )
}

export default SignInTab
