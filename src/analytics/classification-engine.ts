import type { BehavioralFeatures, SessionClassification } from "~/types/session-analysis-export"
import type { Session } from "~/types/session"

export class ClassificationEngine {
  classify(_session: Session, _features: BehavioralFeatures): SessionClassification[] {
    return []
  }
}

export const classificationEngine = new ClassificationEngine()
