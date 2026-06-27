import type { AuthBridgeResponse } from "~/constants/auth-messages"
import { AUTH_MESSAGE, SIGN_IN_PAGE_PATH } from "~/constants/auth-messages"

function getSignInUrl(): string {
  return chrome.runtime.getURL(SIGN_IN_PAGE_PATH)
}

/**
 * Opens the dedicated sign-in tab. Use this for all auth entry points.
 * Never use Clerk modal mode — Chrome extension popups close when switching tabs (OTP flow).
 */
export function openSignInPage(hash = "#/sign-in"): void {
  const url = `${getSignInUrl()}${hash.startsWith("#") ? hash : `#/${hash}`}`

  if (typeof chrome.tabs?.create === "function") {
    chrome.tabs.create({ url })
    return
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer")

  if (opened) {
    return
  }

  chrome.runtime.sendMessage({ type: AUTH_MESSAGE.OPEN_SIGN_IN, hash }, () => {
    if (chrome.runtime.lastError) {
      console.error("[LeetEx] Could not open sign-in page:", chrome.runtime.lastError.message)
    }
  })
}

export async function getAuthState(): Promise<AuthBridgeResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: AUTH_MESSAGE.GET_AUTH }, (response: AuthBridgeResponse) => {
      if (chrome.runtime.lastError) {
        resolve({ isSignedIn: false, userId: null, email: null })
        return
      }

      resolve(
        response ?? {
          isSignedIn: false,
          userId: null,
          email: null
        }
      )
    })
  })
}

export async function signOut(): Promise<void> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: AUTH_MESSAGE.SIGN_OUT }, () => {
      resolve()
    })
  })
}

export async function getToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: AUTH_MESSAGE.GET_TOKEN }, (response: { token?: string | null }) => {
      if (chrome.runtime.lastError) {
        resolve(null)
        return
      }

      resolve(response?.token ?? null)
    })
  })
}

export const authBridgeService = {
  getAuthState,
  getToken,
  openSignInPage,
  signOut
}
