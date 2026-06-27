import { createClerkClient } from "@clerk/chrome-extension/client"
import type { Clerk } from "@clerk/clerk-js/no-rhc"

import type { AuthBridgeResponse } from "~/constants/auth-messages"
import { AUTH_MESSAGE, SIGN_IN_PAGE_PATH } from "~/constants/auth-messages"
import { assertClerkPublishableKey, getClerkRedirectUrl } from "~/constants/clerk"

let clerkClientPromise: Promise<Clerk> | null = null

function getClerkClient(): Promise<Clerk> {
  if (!clerkClientPromise) {
    clerkClientPromise = createClerkClient({
      publishableKey: assertClerkPublishableKey(),
      background: true
    })
  }

  return clerkClientPromise
}

async function readAuthState(): Promise<AuthBridgeResponse> {
  try {
    const clerk = await getClerkClient()

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

    if (message?.type === AUTH_MESSAGE.SIGN_OUT) {
      void (async () => {
        try {
          const clerk = await getClerkClient()
          await clerk.signOut({ redirectUrl: getClerkRedirectUrl("popup.html") })
          sendResponse({ success: true })
        } catch (error) {
          console.error("[LeetEx] Clerk sign out failed", error)
          sendResponse({ success: false })
        }
      })()

      return true
    }

    return undefined
  })
}
