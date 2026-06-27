export const CLERK_PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY

export function getClerkExtensionUrl(): string {
  return chrome.runtime.getURL(".")
}

export function getClerkExtensionOrigin(): string {
  const origin = new URL(chrome.runtime.getURL(".")).origin

  if (origin.includes("invalid") || !chrome.runtime?.id) {
    throw new Error(
      "LeetEx extension context is invalid. Reload the extension at chrome://extensions."
    )
  }

  return origin
}

export function getClerkRedirectUrl(path: string): string {
  const url = chrome.runtime.getURL(path)

  if (url.includes("invalid") || !chrome.runtime?.id) {
    throw new Error(
      "LeetEx extension context is invalid. Reload the extension at chrome://extensions."
    )
  }

  return url
}

export function getSignInTabBaseUrl(): string {
  return getClerkRedirectUrl("tabs/sign-in.html")
}

export function getSignInTabUrl(hash: "#/sign-in" | "#/sign-up" | "#/sso-callback" = "#/sign-in"): string {
  const base = getSignInTabBaseUrl()
  return `${base}${hash}`
}

export function assertClerkPublishableKey(): string {
  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      "Add PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to .env.development (see .env.development.example)"
    )
  }

  return CLERK_PUBLISHABLE_KEY
}
