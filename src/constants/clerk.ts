export const CLERK_PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY

export function getClerkExtensionUrl(): string {
  return chrome.runtime.getURL(".")
}

export function getClerkExtensionOrigin(): string {
  return new URL(chrome.runtime.getURL(".")).origin
}

export function getClerkRedirectUrl(path: string): string {
  return chrome.runtime.getURL(path)
}

export function assertClerkPublishableKey(): string {
  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      "Add PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to .env.development (see .env.development.example)"
    )
  }

  return CLERK_PUBLISHABLE_KEY
}
