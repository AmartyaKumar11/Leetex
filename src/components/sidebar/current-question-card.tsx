import { Badge } from "~/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import type { Difficulty } from "~/types/session"

interface CurrentQuestionCardProps {
  title: string | null
  difficulty: Difficulty | null
}

function difficultyVariant(difficulty: Difficulty | null) {
  switch (difficulty) {
    case "Easy":
      return "easy" as const
    case "Medium":
      return "medium" as const
    case "Hard":
      return "hard" as const
    default:
      return "muted" as const
  }
}

export function CurrentQuestionCard({ title, difficulty }: CurrentQuestionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Question</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {title ? (
          <>
            <p className="text-sm font-medium leading-snug text-foreground">{title}</p>
            <Badge variant={difficultyVariant(difficulty)}>
              {difficulty ?? "Unknown"}
            </Badge>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Open a LeetCode problem to begin your session.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
