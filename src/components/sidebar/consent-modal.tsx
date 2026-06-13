import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"

interface ConsentModalProps {
  onAccept: () => void
}

export function ConsentModal({ onAccept }: ConsentModalProps) {
  return (
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leetex-consent-title">
      <Card className="w-full max-w-md border-border bg-card shadow-leetex-lg">
        <CardHeader>
          <CardTitle id="leetex-consent-title" className="normal-case tracking-normal">
            Welcome to LeetEx
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            LeetEx records your problem-solving journey to help you learn better.
          </p>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              LeetEx records
            </p>
            <ul className="space-y-1.5 text-sm text-foreground">
              <li>• Code snapshots</li>
              <li>• Session events</li>
              <li>• Run and submit outcomes</li>
            </ul>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            No data leaves your device automatically. All exports are manually controlled by you.
          </p>

          <Button type="button" className="w-full" onClick={onAccept}>
            I Understand
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
