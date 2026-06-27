import { useMemo, useState } from "react"

import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { SIGN_IN_PAGE_PATH } from "~/constants/auth-messages"
import { getAuthState, openSignInPage, signOut } from "~/services/auth-bridge-service"

interface AuthSectionProps {
  isAuthenticated: boolean
  email: string | null
  onAuthChange: () => void
}

export function AuthSection({ isAuthenticated, email, onAuthChange }: AuthSectionProps) {
  const [busy, setBusy] = useState(false)
  const signInUrl = useMemo(() => chrome.runtime.getURL(SIGN_IN_PAGE_PATH), [])

  const handleSignOut = async () => {
    setBusy(true)

    try {
      await signOut()
      await getAuthState()
      onAuthChange()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isAuthenticated ? (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Opens a dedicated extension tab — keep it open while you check email for OTP
              codes. Use <strong>email + password/OTP</strong> only.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <a
                  href={signInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => {
                    event.preventDefault()
                    openSignInPage("#/sign-in")
                  }}>
                  Sign in
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a
                  href={`${signInUrl}#/sign-up`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => {
                    event.preventDefault()
                    openSignInPage("#/sign-up")
                  }}>
                  Sign up
                </a>
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Signed in{email ? ` as ${email}` : ""}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
