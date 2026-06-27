import { ClerkProvider } from "@clerk/chrome-extension"
import type { ReactNode } from "react"

import {
  assertClerkPublishableKey,
  getClerkExtensionOrigin,
  getClerkRedirectUrl
} from "~/constants/clerk"

interface ClerkLeetExProviderProps {
  children: ReactNode
  /** Extension page used for Clerk redirects, e.g. popup.html or tabs/sign-in.html */
  redirectPath?: string
  appearance?: Record<string, unknown>
}

type ChromeClerkProviderProps = {
  publishableKey: string
  afterSignOutUrl?: string
  signInFallbackRedirectUrl?: string
  signUpFallbackRedirectUrl?: string
  signInForceRedirectUrl?: string
  signUpForceRedirectUrl?: string
  allowedRedirectProtocols?: string[]
  allowedRedirectOrigins?: Array<string | RegExp>
  appearance?: Record<string, unknown>
  children: ReactNode
}

const ChromeClerkProvider = ClerkProvider as React.ComponentType<ChromeClerkProviderProps>

export function ClerkLeetExProvider({
  children,
  redirectPath = "popup.html",
  appearance
}: ClerkLeetExProviderProps) {
  const redirectUrl = getClerkRedirectUrl(redirectPath)
  const extensionOrigin = getClerkExtensionOrigin()

  return (
    <ChromeClerkProvider
      publishableKey={assertClerkPublishableKey()}
      afterSignOutUrl={redirectUrl}
      signInFallbackRedirectUrl={redirectUrl}
      signUpFallbackRedirectUrl={redirectUrl}
      signInForceRedirectUrl={redirectUrl}
      signUpForceRedirectUrl={redirectUrl}
      allowedRedirectProtocols={["chrome-extension:"]}
      allowedRedirectOrigins={[extensionOrigin, new RegExp(`^${extensionOrigin}`)]}
      appearance={appearance}>
      {children}
    </ChromeClerkProvider>
  )
}
