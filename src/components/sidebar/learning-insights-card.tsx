import { Check } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import type { BehavioralSignal } from "~/types/behavioral-signal"
import { getInsightLabel } from "~/utils/insight-labels"

interface LearningInsightsCardProps {
  insights: BehavioralSignal[]
}

export function LearningInsightsCard({ insights }: LearningInsightsCardProps) {
  const topInsights = insights.slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning Insights</CardTitle>
      </CardHeader>
      <CardContent>
        {topInsights.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Insights will appear as you work through the problem.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {topInsights.map((insight) => (
              <li key={insight.signal} className="flex items-start gap-2.5">
                <Check
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
                <span className="text-sm font-normal text-foreground">
                  {getInsightLabel(insight.signal)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
