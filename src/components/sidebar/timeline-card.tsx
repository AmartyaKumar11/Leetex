import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"

interface TimelineCardProps {
  entries: string[]
}

export function TimelineCard({ entries }: TimelineCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your session timeline will appear here.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {entries.map((entry, index) => (
              <li
                key={`${entry}-${index}`}
                className="flex gap-3 text-muted-foreground transition-colors hover:text-foreground">
                <span className="shrink-0 tabular-nums">{entry.split(" ")[0]}</span>
                <span className="text-foreground/90">{entry.slice(entry.indexOf(" ") + 1)}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
