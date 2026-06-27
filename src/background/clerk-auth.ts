import { createClerkClient } from "@clerk/chrome-extension/client"
import type { Clerk } from "@clerk/clerk-js/no-rhc"

import type { AuthBridgeResponse } from "~/constants/auth-messages"
import { AUTH_MESSAGE, SIGN_IN_PAGE_PATH } from "~/constants/auth-messages"
import { assertClerkPublishableKey, getClerkRedirectUrl } from "~/constants/clerk"

async function createBackgroundClerk(): Promise<Clerk> {
  return createClerkClient({
    publishableKey: assertClerkPublishableKey(),
    background: true
  })
}

async function readAuthState(): Promise<AuthBridgeResponse> {
  try {
    const clerk = await createBackgroundClerk()

    return {
      isSignedIn: Boolean(clerk.user),
      userId: clerk.user?.id ?? null,
      email: clerk.user?.primaryEmailAddress?.emailAddress ?? null
    }
  } catch (error) {
    console.error("[LeetEx] Clerk auth state read failed", error)
    return { isSignedIn: false, userId: null, email: null }
  }
}

export function registerClerkAuthHandlers(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === AUTH_MESSAGE.OPEN_SIGN_IN) {
      const hash = typeof message.hash === "string" ? message.hash : "#/sign-in"
      const url = `${chrome.runtime.getURL(SIGN_IN_PAGE_PATH)}${hash.startsWith("#") ? hash : `#/${hash}`}`

      void chrome.tabs
        .create({ url })
        .then(() => sendResponse({ success: true }))
        .catch((error: unknown) => {
          console.error("[LeetEx] Failed to open sign-in tab", error)
          sendResponse({ success: false })
        })

      return true
    }

    if (message?.type === AUTH_MESSAGE.GET_AUTH) {
      void readAuthState().then(sendResponse)
      return true
    }

    if (message?.type === AUTH_MESSAGE.GET_TOKEN) {
      void (async () => {
        try {
          const clerk = await createBackgroundClerk()
          const token = await clerk.session?.getToken({ skipCache: true })
          sendResponse({ token: token ?? null })
        } catch (error) {
          console.error("[LeetEx] Clerk token retrieval failed", error)
          sendResponse({ token: null })
        }
      })()

      return true
    }

    if (message?.type === AUTH_MESSAGE.SIGN_OUT) {
      void (async () => {
        try {
          const clerk = await createBackgroundClerk()
          await clerk.signOut({ redirectUrl: getClerkRedirectUrl("popup.html") })
          sendResponse({ success: true })
        } catch (error) {
          console.error("[LeetEx] Clerk sign out failed", error)
          sendResponse({ success: false })
        }
      })()

      return true
    }

    if (message?.type === AUTH_MESSAGE.SYNC_SESSION) {
      void (async () => {
        const backendUrl = process.env.PLASMO_PUBLIC_BACKEND_URL

        if (!backendUrl || !message?.payload) {
          sendResponse({ ok: false })
          return
        }

        try {
          const clerk = await createBackgroundClerk()
          const token = await clerk.session?.getToken({ skipCache: true })

          if (!token) {
            sendResponse({ ok: false, status: 401 })
            return
          }

          const response = await fetch(`${backendUrl}/sessions/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(message.payload)
          })

          sendResponse({ ok: response.ok, status: response.status })
        } catch (error) {
          console.error("[LeetEx] Session sync failed", error)
          sendResponse({ ok: false })
        }
      })()

      return true
    }

    return undefined
  })
}
