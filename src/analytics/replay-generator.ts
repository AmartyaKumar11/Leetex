import type { ReplayEntry } from "~/types/session-analysis-export"
import type { Session } from "~/types/session"

export class ReplayGenerator {
  generate(_session: Session): ReplayEntry[] {
    return []
  }
}

export const replayGenerator = new ReplayGenerator()
