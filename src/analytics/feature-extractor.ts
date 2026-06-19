import { createPlaceholderBehavioralFeatures, type BehavioralFeatures } from "~/types/session-analysis-export"
import type { Session } from "~/types/session"

export class FeatureExtractor {
  extract(_session: Session): BehavioralFeatures {
    return createPlaceholderBehavioralFeatures()
  }
}

export const featureExtractor = new FeatureExtractor()
