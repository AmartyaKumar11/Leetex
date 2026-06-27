import { Copy, Check } from "lucide-react"
import { useState } from "react"

import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { StatusIndicator } from "~/components/sidebar/status-indicator"

interface AboutLeetExCardProps {
  userId: string | null
  version: string
  extensionActive: boolean
  isAuthenticated: boolean
}

function truncateUserId(userId: string): string {
  return `${userId.slice(0, 8)}…${userId.slice(-4)}`
}

export function AboutLeetExCard({
  userId,
  version,
  extensionActive,
  isAuthenticated
}: AboutLeetExCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyUserId = async () => {
    if (!userId) {
      return
    }

    try {
      await navigator.clipboard.writeText(userId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>About LeetEx</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Extension Status</span>
          <StatusIndicator active={extensionActive} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Version</span>
          <span className="text-sm font-medium">{version}</span>
        </div>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">User ID</span>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground">
              {userId ? truncateUserId(userId) : "Initializing…"}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!userId}
              onClick={handleCopyUserId}
              className="shrink-0">
              {copied ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span className="sr-only">Copy User ID</span>
            </Button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {isAuthenticated
              ? "Your Clerk account ID is included in exports."
              : "Anonymous install ID until you sign in above."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
