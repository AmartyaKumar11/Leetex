import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { formatElapsedSeconds } from "~/utils/time"

interface SessionOverviewCardProps {
  elapsedSeconds: number
  runs: number
  submits: number
}

export function SessionOverviewCard({
  elapsedSeconds,
  runs,
  submits
}: SessionOverviewCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-3 gap-3">
          <div>
            <dt className="text-[11px] text-muted-foreground">Elapsed</dt>
            <dd className="mt-1 text-sm font-medium">{formatElapsedSeconds(elapsedSeconds)}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Runs</dt>
            <dd className="mt-1 text-sm font-medium">{runs}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Submits</dt>
            <dd className="mt-1 text-sm font-medium">{submits}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
