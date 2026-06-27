import { Show, UserButton } from "@clerk/chrome-extension"

import { CLERK_EXTENSION_APPEARANCE } from "~/constants/clerk-appearance"
import { ClerkLeetExProvider } from "~/providers/clerk-leetex-provider"
import { openSignInPage } from "~/services/auth-bridge-service"

import "~/style.css"

function IndexPopup() {
  const handleOpenSignIn = () => {
    openSignInPage()
    window.close()
  }

  return (
    <ClerkLeetExProvider redirectPath="popup.html" appearance={CLERK_EXTENSION_APPEARANCE}>
      <div className="leetex-root dark flex min-h-[320px] w-[380px] flex-col gap-4 p-6">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">LeetEx</h1>
          <p className="text-xs text-muted-foreground">
            Sign-in opens in a dedicated tab so you can switch to email for OTP codes
            without losing progress.
          </p>
        </div>

        <Show when="signed-out">
          <button
            type="button"
            onClick={handleOpenSignIn}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Open sign in
          </button>
        </Show>

        <Show when="signed-in">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Signed in</span>
            <UserButton />
          </div>
        </Show>
      </div>
    </ClerkLeetExProvider>
  )
}

export default IndexPopup
